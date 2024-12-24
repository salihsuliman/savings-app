import { Session } from "express-session";

declare module "express-session" {
  interface SessionData {
    access_token?: string;
  }
}
