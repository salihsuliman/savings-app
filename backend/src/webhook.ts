import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";

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

function handleTxnWebhook(code: string, requestBody: any) {
  switch (code) {
    case "SYNC_UPDATES_AVAILABLE":
      break;
    // If we're using sync, we don't really need to concern ourselves with the
    // other transactions-related webhooks
    default:
      console.log(`Can't handle webhook code ${code}`);
      break;
  }
}

async function handleLinkWebhook(code: string, requestBody: any) {
  switch (code) {
    case "SESSION_FINISHED":
      await fetch("http://localhost:8080/api/exchange_public_token", {
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
