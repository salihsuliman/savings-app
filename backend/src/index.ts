import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from a .env file
dotenv.config();

const app = express();
const port = 8080;

const supabase = createClient(
  process.env.TEST_SUPABASE_URL || "",
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ""
);

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

// Route to create a Link token
app.post(
  "/api/create_link_token",
  async (req: Request, res: Response, next: NextFunction) => {
    let payload: any = {};

    console.log("creating link token!!!!!");

    // Payload if running on iOS
    if (req.body.address === "localhost") {
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
      next(error);
    }
  }
);

let access_token = "";

// Route to exchange public token for access token
app.post(
  "/api/exchange_public_token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("exchanging public token!!!!!");
      const exchangeResponse = await client.itemPublicTokenExchange({
        public_token: req.body.public_token,
      });

      console.log("exchange details", {
        exchangeResponse: exchangeResponse.data.access_token,
        public_token: req.body.public_token,
      });

      const session = await supabase.auth.getSession();

      // Grab user id from session
      // Store the access token in the user table

      // Store the access_token in session (for demo purposes)
      access_token = exchangeResponse.data.access_token;
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

    console.log("request", req.session);

    try {
      if (!access_token) {
        res.status(400).json({ error: "Access token not available" });
      }
      await client
        .transactionsGet({
          access_token: access_token || "",
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
  console.log("process.env.PLAID_WEBHOOK", process.env.PLAID_WEBHOOK);
});
