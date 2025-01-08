import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";
import { createClient as createRedisClient } from "redis";
import type { TransactionType } from "./types";

import { RedisStore } from "connect-redis";

// Load environment variables from a .env file
dotenv.config();

const app = express();
const port = process.env.PORT;

const supabase = createClient<Database>(
  process.env.TEST_SUPABASE_URL || "",
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ""
);

const devEnv = process.env.NODE_ENV === "development";

// Setup Redis and Session configuration
// Initialize client.
const redisClient = createRedisClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});
redisClient.connect().catch();

redisClient.on("error", (err) => console.log("Redis Client Error", err));

// Initialize store.
const redisStore = new RedisStore({
  client: redisClient,
  prefix: "savingsApp:",
});

// Initialize session storage.
app.use(
  session({
    store: redisStore,
    resave: false, // required: force lightweight session keep alive (touch)
    saveUninitialized: false, // recommended: only save session when data exists
    secret: "super-secret-saving",
  })
);

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuration for the Plaid client
const config = new Configuration({
  basePath:
    PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
      "Plaid-Version": "2020-09-14",
    },
  },
});

// Instantiate the Plaid client with the configuration
const client = new PlaidApi(config);

function getMonthRange(dateString: string) {
  // Convert the input string to a Date object
  const date = new Date(dateString);

  // Get the first day of the month
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

  // Get the last day of the month
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  // Format the dates to YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  return {
    firstDay: formatDate(firstDay),
    lastDay: formatDate(lastDay),
  };
}

app.get("/api/set-tokens", async (req: Request, res: Response) => {
  try {
    const loggedInUserToken =
      req.headers.authorization?.split(" ")[1] || "no token found";

    await redisClient.set("loggedInUserToken", loggedInUserToken);

    res.json({
      message: "Token has been set",
    });
  } catch (error) {
    console.error("Error fetching from Redis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to create a Link token
app.get(
  "/api/create_link_token",
  async (req: Request, res: Response, next: NextFunction) => {
    let payload: any = {};

    // Payload if running on iOS
    if (devEnv) {
      payload = {
        user: { client_user_id: req.sessionID },
        client_name: "Savings Apps",
        language: "en",
        products: ["auth", "transactions"],
        country_codes: ["US", "US", "CA", "ES", "FR", "GB", "IE", "NL"],
        redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI!,
        webhook: process.env.PLAID_WEBHOOK,
        hosted_link: {
          is_mobile_app: false,
          completion_redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI!,
        },
      };
    } else {
      // Payload if running on Android
      payload = {
        user: { client_user_id: req.sessionID },
        client_name: "Savings Apps",
        language: "en",
        products: ["auth", "transactions"],
        country_codes: ["US", "US", "CA", "ES", "FR", "GB", "IE", "NL"],
        android_package_name: process.env.PLAID_ANDROID_PACKAGE_NAME!,
        webhook: process.env.PLAID_WEBHOOK,
        hosted_link: {
          is_mobile_app: false,
          completion_redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI!,
        },
      };
    }

    try {
      const tokenResponse = await client.linkTokenCreate(payload);
      res.json(tokenResponse.data);
    } catch (error) {
      console.log("error", error);
      next(error);
    }
  }
);

// Route to exchange public token for access token
app.post(
  "/api/exchange_public_token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("exchanging public token");

      const exchangeResponse = await client.itemPublicTokenExchange({
        public_token: req.body.public_token,
      });

      await populateBankName(
        exchangeResponse.data.item_id,
        exchangeResponse.data.access_token
      );

      res.json(true);
    } catch (error) {
      console.log("Exchange error", error);
      next(error);
    }
  }
);

// Route to fetch account balance
app.post(
  "/api/balance",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("getting balance!!!!!");

    try {
      const loggedInUser = await redisClient.get("loggedInUserToken");
      const monthData: string = req.body.currentMonth;
      const dates = getMonthRange(monthData);

      if (!loggedInUser) {
        res
          .status(400)
          .json({ error: "User not logged in, or User no user token found" });
        return;
      }

      const { data: userData, error: supaError } = await supabase.auth.getUser(
        loggedInUser
      );

      if (supaError) {
        res.status(400).json(supaError);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("access_token")
        .eq("id", userData.user.id);

      if (error || !data[0] || !data[0].access_token) {
        res.status(400).json({ error: "Error fetching access token" });
        return;
      }

      await client
        .transactionsGet({
          access_token: data[0].access_token,
          start_date: dates.firstDay,
          end_date: dates.lastDay,
          options: {
            count: 50,
          },
        })
        .then(async (response) => {
          const transactions = response.data.transactions || [];

          // Extract transaction IDs to check for existing ones
          const transactionIds = transactions.map(
            (tran) => tran.transaction_id
          );

          // Query for existing transaction IDs
          const { data: existingTransactions, error: existingError } =
            await supabase
              .from("transactions")
              .select("*") // Select all fields to return existing transactions
              .in("transaction_id", transactionIds);

          if (existingError) {
            res
              .status(500)
              .json({ error: "Error checking existing transactions" });
            return;
          }

          // Filter out already existing transactions
          const existingIds = new Set(
            existingTransactions?.map((tran) => tran.transaction_id)
          );

          const newTransactions = transactions.filter(
            (tran) => !existingIds.has(tran.transaction_id)
          );

          // Format the new transactions for insertion
          const formattedTransaction: TransactionType[] = newTransactions.map(
            (tran) => ({
              user_id: userData.user.id,
              bank_id: tran.account_id,
              amount: tran.amount,
              category: JSON.stringify(tran.category) || "",
              category_id: tran.personal_finance_category?.detailed || "",
              date: tran.date,
              date_time: tran.datetime,
              currency: tran.iso_currency_code,
              merchant_name: tran.merchant_name || "none found",
              name: tran.name,
              transaction_code: tran.transaction_code,
              transaction_id: tran.transaction_id,
              transaction_type: tran.transaction_type || "none found",
            })
          );

          if (formattedTransaction.length === 0) {
            // Return the existing transactions if no new transactions found
            res.json({
              message: "No new transactions to insert.",
              Balance: existingTransactions,
            });
            return;
          }

          // Insert only new transactions
          const { error: insertError } = await supabase
            .from("transactions")
            .insert(formattedTransaction);

          if (insertError) {
            console.error(1111, insertError);
            res.status(500).json(insertError);
            return;
          }

          res.json({
            Balance: formattedTransaction,
          });

          return;
        })
        .catch((error) => {
          console.log("Error fetching transactions:", error);
          res.status(500).json({ error: "Error fetching transactions" });
        });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

const populateBankName = async (itemId: string, accessToken: string) => {
  try {
    const loggedInUser = await redisClient.get("loggedInUserToken");

    if (!loggedInUser) {
      throw new Error("User not logged in, or User no user token found");
    }

    const itemResponse = await client.itemGet({
      access_token: accessToken,
    });
    const institutionId = itemResponse.data.item.institution_id;
    if (institutionId == null) {
      return;
    }
    const institutionResponse = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: [
        CountryCode.Us,
        CountryCode.Ca,
        CountryCode.Es,
        CountryCode.Fr,
        CountryCode.Gb,
        CountryCode.Ie,
        CountryCode.Nl,
      ],
    });
    const institutionName = institutionResponse.data.institution.name;

    const { data: userData, error: supaError } = await supabase.auth.getUser(
      loggedInUser
    );

    if (supaError) {
      throw new Error(supaError.name, {
        cause: supaError.message,
      });
      return;
    }

    const { error } = await supabase.from("bank_accounts").insert({
      access_token: accessToken,
      bank_name: institutionName,
      item_id: itemId,
      user_id: userData.user?.id,
    });

    if (error) {
      throw new Error(error.name, {
        cause: error.message,
      });
    }

    console.log("Bank account added to database");
  } catch (error) {
    console.log(`Ran into an error! ${error}`);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}...`);
});
