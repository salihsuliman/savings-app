import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";

// Load environment variables from a .env file
dotenv.config();

const app = express();
const port = process.env.PORT;

const supabase = createClient<Database>(
  process.env.TEST_SUPABASE_URL || "",
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ""
);

const devEnv = process.env.NODE_ENV === "development";

declare module "express-session" {
  interface SessionData {
    token?: string;
  }
}

// Session configuration
app.use(session({ secret: "bosco", saveUninitialized: true, resave: true }));

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

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// Route to create a Link token
app.get(
  "/api/create_link_token",
  async (req: Request, res: Response, next: NextFunction) => {
    let payload: any = {};

    const token = req.headers.authorization?.split(" ")[1];
    req.session.token = token;

    console.log("token stored", req.session.token);

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
      console.log(tokenResponse.data);
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

      console.log("req.session.token", req.session.token);

      const { data, error: supaError } = await supabase.auth.getUser(
        req.session.token
      );

      console.log(11111111, {
        data,
        supaError,
        exchangeResponse,
      });

      if (!data.user?.id) {
        res
          .status(400)
          .json({ error: "User not logged in, or User not found" });
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ access_token: exchangeResponse.data.access_token })
        .eq("id", data.user?.id);

      if (error) {
        res.status(400).json({ error: "Error updating access token" });
        return;
      }

      res.json(true);
    } catch (error) {
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
      const session = await supabase.auth.getSession();

      const userId = session.data.session?.user.id;

      if (!userId) {
        res
          .status(400)
          .json({ error: "User not logged in, or User not found" });
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("access_token")
        .eq("id", userId);

      if (error || !data[0] || !data[0].access_token) {
        res.status(400).json({ error: "Error fetching access token" });
        return;
      }

      await client
        .transactionsGet({
          access_token: data[0].access_token,
          start_date: "2024-06-01",
          end_date: "2024-12-31",
        })
        .then((response) => {
          console.log("response", response.data.transactions);
          res.json({
            Balance: response.data.transactions,
          });
        })
        .catch((error) => {
          console.log("error", error);
        });
    } catch (error) {
      next(error);
    }
  }
);

// Start the server
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}...`);
});
