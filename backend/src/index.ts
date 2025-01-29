import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";
import { createClient as createRedisClient } from "redis";
import { WebSocketServer } from "ws";

import type {
  TransactionsSupabase,
  TransactionType,
  TransformedTransactions,
} from "./types";

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

// Set up WebSocket server
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    console.log(`Received message => ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

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
    console.log("setting tokens");
    const loggedInUserToken =
      req.headers.authorization?.split(" ")[1] || "no token found";

    await redisClient.set("loggedInUserToken", loggedInUserToken);

    console.log("token has been set");

    res.json({
      message: "Token has been set",
    });
  } catch (error) {
    console.error("Error fetching from Redis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get(
  "/api/get-banks",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loggedInUserToken =
        req.headers.authorization?.split(" ")[1] || "no token found";

      const {
        user,
        noLoggedInUser,
        supaError: fetchUserError,
      } = await fetchUser(loggedInUserToken);

      if (!user || noLoggedInUser || fetchUserError) {
        res.status(400).json({
          user,
          noLoggedInUser,
          fetchUserError,
        });

        console.log("Error fetching user", {
          user,
          noLoggedInUser,
          fetchUserError,
        });
        return;
      }

      const { data: bankCards, error: supaError } = await supabase
        .from("bank_accounts")
        .select()
        .eq("user_id", user!.id);

      if (supaError) {
        res.status(400).json(supaError);
        console.log("error fetching bank accounts", supaError);
        return;
      }

      res.json(bankCards);

      return;
    } catch (error) {
      res.status(400).json(error);
      console.log(error);
      next(error);
    }
  }
);

app.post(
  "/api/delete-bank-account",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loggedInUserToken =
        req.headers.authorization?.split(" ")[1] || "no token found";

      const { access_token, bank_id } = req.body;

      const {
        user,
        noLoggedInUser,
        supaError: fetchUserError,
      } = await fetchUser(loggedInUserToken);

      if (!user || noLoggedInUser || fetchUserError) {
        res.status(400).json({
          user,
          noLoggedInUser,
          fetchUserError,
        });

        console.log("Error fetching user", {
          user,
          noLoggedInUser,
          fetchUserError,
        });
        return;
      }

      const { error: supaErrorTransaction } = await supabase
        .from("transactions")
        .delete()
        .eq("bank_id", bank_id);

      const { error: supaError } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("access_token", access_token);

      if (supaErrorTransaction) {
        res.status(400).json(supaErrorTransaction);
        console.log("error deleting transactions", supaErrorTransaction);
        return;
      }

      if (supaError) {
        res.status(400).json(supaError);
        console.log("error deleting bank accounts", supaError);
        return;
      }

      res.json({
        ok: true,
      });

      return;
    } catch (error) {
      res.status(400).json(error);
      console.log(error);
      next(error);
    }
  }
);

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

      await syncTransactions(exchangeResponse.data.item_id);

      // Send WebSocket message to client
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          console.log("s--------- ending websocket message!-----------");
          client.send(JSON.stringify({ message: "new_bank_card_ready" }));
        }
      });

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
      const loggedInUserToken =
        req.headers.authorization?.split(" ")[1] || "no token found";

      const monthData: string = req.body.currentMonth;
      const accessToken = req.body.access_token;
      const dates = getMonthRange(monthData);

      const { data: userData, error: supaError } = await supabase.auth.getUser(
        loggedInUserToken
      );

      if (supaError) {
        console.log("supaError", supaError);
        res.status(400).json({
          message: "No new transactions to insert.",
          Balance: [],
        });
        return;
      }

      const { data: bankData, error: bankError } = await supabase
        .from("bank_accounts")
        .select()
        .in("access_token", accessToken)
        .eq("user_id", userData.user.id);

      if (bankError) {
        console.log("bankError", bankError);
        res.status(400).json({
          message: "No new transactions to insert.",
          Balance: [],
        });
        return;
      }

      // Query for existing transaction IDs
      const { data: transactions, error: existingError } = await supabase
        .from("transactions")
        .select("*") // Select all fields to return existing transactions
        .in(
          "bank_id",
          bankData.map((bank) => bank.item_id)
        )
        .gte("date", dates.firstDay) // Filter transactions with date >= startDate
        .lte("date", dates.lastDay) // Filter transactions with date <= endDate
        .order("date", { ascending: false }); // Order by date in descending order

      if (existingError) {
        console.log("existingError", existingError);
        res.status(400).json({
          message: "No new transactions to insert.",
          Balance: [],
        });
        return;
      }

      // Group transactions by date

      // Group transactions by date
      const groupedTransactions = transactions.reduce((acc, transaction) => {
        const date = transaction.date;

        if (!date) return acc;

        const splitDateArray = date.split("-");
        const formattedDate = `${splitDateArray[2]}-${splitDateArray[1]}-${splitDateArray[0]}`;

        if (!acc[formattedDate]) {
          acc[formattedDate] = [];
        }

        acc[formattedDate].push(transaction);
        return acc;
      }, {} as { [key: string]: typeof transactions });

      // Transform the grouped data into the desired format
      const transformedData = Object.keys(groupedTransactions).map((date) => ({
        date,
        transactions: groupedTransactions[date],
      }));

      res.json({
        transactions: transformedData,
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        message: "No new transactions to insert.",
        Balance: [],
      });
      next(error);
    }
  }
);

// Get pots
app.get(
  "/api/get-pots",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("getting pots!!!!");
      const user_id = req.headers.user_id || "no token found";

      const { data: pots, error: supaError } = await supabase
        .from("savings_pot")
        .select()
        .eq("user_id", user_id)
        .order("amount", { ascending: false });

      if (supaError) {
        res.status(400).json(supaError);
        console.log("error fetching pots", supaError);
        return;
      }

      const formattedPots = pots.map((pot) => {
        return {
          ...pot,
          transactions: JSON.parse(pot.transactions || "[]"),
        };
      });

      res.status(200).json({ pots: formattedPots });

      return;
    } catch (error) {
      res.status(400).json(error);
      console.log(error);
      next(error);
    }
  }
);

// Add pot
app.post(
  "/api/add-pot",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { label, amount, color, user_id, transactions } = req.body;

      const { error: supaError } = await supabase.from("savings_pot").insert({
        label,
        amount,
        color,
        user_id,
        transactions,
      });

      if (supaError) {
        res.status(400).json(supaError);
        console.log("error adding pots", supaError);
        return;
      }

      res.status(200).json({ ok: true });

      return;
    } catch (error) {
      res.status(400).json(error);
      console.log(error);
      next(error);
    }
  }
);

// Update pot
app.post(
  "/api/update-pot",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("------- Updating pots -------");
      const { id, label, amount, color, user_id, transactions } = req.body;

      console.log("transaction", transactions);

      const { error: supaError } = await supabase
        .from("savings_pot")
        .update({
          label,
          amount,
          color,
          transactions,
        })
        .eq("user_id", user_id)
        .eq("id", id);

      if (supaError) {
        res.status(400).json(supaError);
        console.log("error adding pots", supaError);
        return;
      }

      res.status(200).json({ ok: true });

      return;
    } catch (error) {
      res.status(400).json(error);
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

const fetchUser = async (userToken: string) => {
  let noLoggedInUser = null;
  let user = null;
  let supaError = null;

  if (!userToken) {
    console.log("no logged in user");
    return { noLoggedInUser: "true", user, supaError };
  }

  const { data: userData, error } = await supabase.auth.getUser(userToken);

  if (error) {
    return { user, supaError: error, noLoggedInUser };
  }

  return { noLoggedInUser, user: userData.user, supaError };
};

const fetchNewSyncData = async (accessToken: string) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Format dates for API request
  const formatDate = (date: Date) => date.toISOString().split("T")[0]; // YYYY-MM-DD format
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  try {
    const results = await client.transactionsGet({
      access_token: accessToken,
      options: {
        include_personal_finance_category: true,
      },
      start_date: formattedStartDate,
      end_date: formattedEndDate,
    });
    const newData = results.data;

    return newData.transactions;
  } catch (error) {
    // If you want to see if this is a sync mutation error, you can look at
    // error?.response?.data?.error_code
    console.log(
      `Oh no! Error! ${JSON.stringify(
        error
      )} Let's try again from the beginning!`
    );
  }
};

const syncTransactions = async (itemId: string) => {
  try {
    // Step 1: Retrieve our access token and cursor from the database

    const { data: fetchBankData, error: fetchBankError } = await supabase
      .from("bank_accounts")
      .select()
      .eq("item_id", itemId);

    if (fetchBankError) {
      console.log("---------- fetchBankError ------------");
      throw new Error(fetchBankError.name, {
        cause: fetchBankError.message,
      });
    }

    const { access_token: accessToken, user_id: userId } = fetchBankData[0];

    if (!accessToken || !userId) {
      console.log("--------- no access token or user id found ------------");
      throw new Error("No access token found!!!!");
    }

    // STEP 2: Save new transactions to the database

    const transactions = await fetchNewSyncData(accessToken);

    const formattedTransaction: TransactionType[] = (transactions || []).map(
      (tran) => ({
        user_id: userId,
        bank_id: itemId,
        amount: tran.amount,
        category: JSON.stringify(tran.category) || "",
        category_id: tran.personal_finance_category?.detailed || "",
        date: new Date(tran.date).toISOString(),
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
      console.log("--------------- no transactions found ---------------");
    }

    await supabase.from("transactions").insert(formattedTransaction);

    // TODO: Do something in our database with the removed transactions

    return {
      totalTransactionsAdded: formattedTransaction.length,
    };
  } catch (error) {}
};

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(port, () => {
  console.log(`Backend server is running on port ${port}...`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
