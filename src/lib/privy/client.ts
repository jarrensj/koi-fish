import { PrivyClient } from "@privy-io/node";

let _privyClient: PrivyClient | null = null;

/** Singleton Privy client. Throws if env is missing. */
export function getPrivyClient(): PrivyClient {
  if (_privyClient) return _privyClient;

  const appId = process.env.PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error("Missing Privy credentials: set PRIVY_APP_ID and PRIVY_APP_SECRET.");
  }

  _privyClient = new PrivyClient({ appId, appSecret });
  return _privyClient;
}
