import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";
import { createClient as createRedisClient } from "redis";
import { Database } from "./database";
import type { TransactionType } from "./types";

import bodyParser from "body-parser";
import { RedisStore } from "connect-redis";

dotenv.config();

/**
 * Our server running on a different port that we'll use for handling webhooks.
 * We run this on a separate port so that it's easier to expose just this
 * server to the world using a tool like ngrok
 */
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 8001;

const webhookApp = express();
webhookApp.use(bodyParser.urlencoded({ extended: false }));
webhookApp.use(bodyParser.json());

const supabase = createClient<Database>(
  process.env.TEST_SUPABASE_URL || "",
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ""
);
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

const webhookServer = webhookApp.listen(WEBHOOK_PORT, () => {
  console.log(
    `Webhook receiver is up and running at http://localhost:${WEBHOOK_PORT}/`
  );
});

webhookApp.post(
  "/server/receive_webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("**INCOMING WEBHOOK**");
      console.dir(req.body, { colors: true, depth: null });
      const product = req.body.webhook_type;
      const code = req.body.webhook_code;

      console.log(`Received webhook for product ${product} with code ${code}`);

      // TODO (maybe): Verify webhook
      switch (product) {
        case "ITEM":
          handleItemWebhook(code, req.body);
          break;
        case "TRANSACTIONS":
          handleTxnWebhook(code, req.body);
          break;
        case "LINK":
          await handleLinkWebhook(code, req.body);
          break;
        default:
          console.log(`Can't handle webhook product ${product}`);
          break;
      }
      res.json({ status: "received" });
    } catch (error) {
      next(error);
    }
  }
);

const handleTxnWebhook = async (code: string, requestBody: any) => {
  switch (code) {
    case "SYNC_UPDATES_AVAILABLE":
      console.log("--------------Syncing transactions!--------------");

      // get item id
      const itemId = requestBody.item_id;

      // grab access token from database using item id as reference

      const { data: itemData, error: itemError } = await supabase
        .from("bank_accounts")
        .select()
        .eq("item_id", itemId);

      if (itemError) {
        console.log("--------------Webhook getting item error--------------");
        throw new Error(itemError.message);
      }

      if (!itemData[0].access_token) {
        console.log("No access token found!", {
          itemData,
        });
        return;
      }
      // grab all transactions

      const { data: transactions } = await client.transactionsSync({
        access_token: itemData[0].access_token,
      });

      console.log("transactions.added", transactions.added);
      // only add transactions that are not already in the database

      const formattedTransaction: TransactionType[] = transactions.added.map(
        (tran) => ({
          user_id: itemData[0].user_id!,
          bank_id: itemData[0].item_id!,
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

      const { data: syncTransactions, error: transactionError } = await supabase
        .from("transactions")
        .insert(formattedTransaction)
        .select();

      if (transactionError) {
        console.log(
          "--------------Webhook getting transaction error--------------"
        );
        throw new Error(transactionError.message);
      }

      console.log({
        syncTransactions,
      });

      break;
    // If we're using sync, we don't really need to concern ourselves with the
    // other transactions-related webhooks
    default:
      console.log(`Can't handle webhook code ${code}`);
      break;
  }
};

async function handleLinkWebhook(code: string, requestBody: any) {
  switch (code) {
    case "SESSION_FINISHED":
      console.log("sending public token to backend");
      await fetch(`${process.env.BACKEND_URL}/exchange_public_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_token: requestBody.public_tokens[0],
        }),
      }).catch((err) => {
        console.log(err);
      });

      break;
    // If we're using sync, we don't really need to concern ourselves with the
    // other transactions-related webhooks
    default:
      console.log(`Can't handle webhook code ${code}`);
      break;
  }
}

function handleItemWebhook(code: string, requestBody: any) {
  switch (code) {
    case "ERROR":
      // The most common reason for receiving this webhook is because your
      // user's credentials changed and they should run Link in update mode to fix it.
      console.log(
        `I received this error: ${requestBody.error.error_message}| should probably ask this user to connect to their bank`
      );
      break;
    case "NEW_ACCOUNTS_AVAILABLE":
      console.log(
        `There are new accounts available at this Financial Institution! (Id: ${requestBody.item_id}) We may want to ask the user to share them with us`
      );
      break;
    case "PENDING_EXPIRATION":
      console.log(
        `We should tell our user to reconnect their bank with Plaid so there's no disruption to their service`
      );
      break;
    case "USER_PERMISSION_REVOKED":
      console.log(
        `The user revoked access to this item. We should remove it from our records`
      );
      break;
    case "WEBHOOK_UPDATE_ACKNOWLEDGED":
      console.log(`Hooray! You found the right spot!`);
      break;
    case "SUCCESS":
      console.log(`Item was successfully added to Plaid`);
      break;
    case "INITIAL_UPDATE":
      console.log(
        `The item was successfully added to Plaid and it's ready for use`
      );
      break;
    default:
      console.log(`Can't handle webhook code ${code}`);
      break;
  }
}

/**
 * Add in some basic error handling so our server doesn't crash if we run into
 * an error.
 */
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`Your error:`);
  console.error(err);
  if (err.response?.data != null) {
    res.status(500).send(err.response.data);
  } else {
    res.status(500).send({
      error_code: "OTHER_ERROR",
      error_message: "I got some other message on the server.",
    });
  }
};
webhookApp.use(errorHandler);

const getWebhookServer = () => {
  return webhookServer;
};

export { getWebhookServer };
