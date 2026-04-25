export type RpConfig = {
  rpID: string;
  rpName: string;
  origin: string;
};

export function getRpConfig(): RpConfig {
  const rpID = process.env.RP_ID;
  const rpName = process.env.RP_NAME;
  const origin = process.env.RP_ORIGIN;
  if (!rpID) throw new Error("RP_ID is not set");
  if (!rpName) throw new Error("RP_NAME is not set");
  if (!origin) throw new Error("RP_ORIGIN is not set");
  return { rpID, rpName, origin };
}

export function isSecureOrigin(): boolean {
  return (process.env.RP_ORIGIN ?? "").startsWith("https://");
}
