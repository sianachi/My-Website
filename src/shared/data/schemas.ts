import { z } from "zod";

export const PaletteSchema = z.enum([
  "midnight",
  "daylight",
  "terracotta",
  "pine",
  "bone",
]);
export type Palette = z.infer<typeof PaletteSchema>;

export const TypePairingSchema = z.enum(["instrument", "bodoni", "dmserif"]);
export type TypePairing = z.infer<typeof TypePairingSchema>;

export const MotifDensitySchema = z.enum(["low", "medium", "high"]);
export type MotifDensity = z.infer<typeof MotifDensitySchema>;

/** Triple of strings rendered into the [left, center, right] cells of a page header/footer. */
export const PageBandSchema = z.tuple([z.string(), z.string(), z.string()]);
export type PageBand = z.infer<typeof PageBandSchema>;

export const NavEntrySchema = z.object({
  id: z.string(),
  page: z.string().regex(/^\d{2}$/),
  label: z.string(),
});
export type NavEntry = z.infer<typeof NavEntrySchema>;

export const CONTENT_DOC_IDS = ["cover", "about", "work", "contact"] as const;
export type ContentDocId = (typeof CONTENT_DOC_IDS)[number];
export function isContentDocId(value: unknown): value is ContentDocId {
  return (
    typeof value === "string" &&
    (CONTENT_DOC_IDS as ReadonlyArray<string>).includes(value)
  );
}

/* ---------- Cover ---------- */

export const CoverStackEntrySchema = z.object({
  tab: z.string(),
  value: z.string(),
});

export const CoverContentSchema = z.object({
  pageHead: PageBandSchema,
  pageFoot: PageBandSchema,
  eyebrow: z.array(z.string()).min(1),
  nameGivenEmphasis: z.string(),
  nameGivenRest: z.string(),
  nameFamily: z.string(),
  lede: z.string(),
  stack: z.array(CoverStackEntrySchema).min(1),
});
export type CoverContent = z.infer<typeof CoverContentSchema>;

/* ---------- About ---------- */

export const AboutListEntrySchema = z.object({
  value: z.string(),
});

export const AboutContentSchema = z.object({
  pageHead: PageBandSchema,
  pageFoot: PageBandSchema,
  bio: z.object({
    lede: z.string(),
    paragraphs: z.array(z.string()).min(1),
  }),
  education: z.array(AboutListEntrySchema).min(1),
  skills: z.array(AboutListEntrySchema).min(1),
});
export type AboutContent = z.infer<typeof AboutContentSchema>;

/* ---------- Work ---------- */

export const WorkMetaRowSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const WorkCardSchema = z.object({
  no: z.string(),
  year: z.string(),
  title: z.string(),
  lede: z.string(),
  meta: z.array(WorkMetaRowSchema).min(1),
  notes: z.array(z.string()).min(1),
  tags: z.array(z.string()).min(1),
});
export type WorkCardData = z.infer<typeof WorkCardSchema>;

export const WorkContentSchema = z.object({
  pageHead: PageBandSchema,
  pageFoot: PageBandSchema,
  cards: z.array(WorkCardSchema).min(1),
});
export type WorkContent = z.infer<typeof WorkContentSchema>;

/* ---------- Contact ---------- */

export const ContactLinkSchema = z.object({
  label: z.string(),
  value: z.string(),
  href: z.string(),
  cta: z.string(),
  external: z.boolean().optional(),
});
export type ContactLink = z.infer<typeof ContactLinkSchema>;

export const ContactContentSchema = z.object({
  pageHead: PageBandSchema,
  pageFoot: PageBandSchema,
  signoff: z.string(),
  sig: z.string(),
  links: z.array(ContactLinkSchema).min(1),
  colophon: z.array(z.string()).min(1),
  interactiveLinkLabel: z.string(),
});
export type ContactContent = z.infer<typeof ContactContentSchema>;

/* ---------- Admin / WebAuthn ---------- */

export const PasskeyTransportSchema = z.enum([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);
export type PasskeyTransport = z.infer<typeof PasskeyTransportSchema>;

export const AdminCredentialSchema = z.object({
  id: z.string(),
  publicKey: z.string(),
  counter: z.number().int().nonnegative(),
  transports: z.array(PasskeyTransportSchema).optional(),
  deviceType: z.enum(["singleDevice", "multiDevice"]).optional(),
  backedUp: z.boolean().optional(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
  label: z.string().optional(),
});
export type AdminCredential = z.infer<typeof AdminCredentialSchema>;

export const AdminDocSchema = z.object({
  _id: z.literal("admin"),
  userHandle: z.string(),
  credentials: z.array(AdminCredentialSchema).min(1),
  createdAt: z.date(),
});
export type AdminDoc = z.infer<typeof AdminDocSchema>;

export const ChallengeKindSchema = z.enum([
  "register",
  "login",
  "add-credential",
]);
export type ChallengeKind = z.infer<typeof ChallengeKindSchema>;

export const ChallengeDocSchema = z.object({
  _id: z.string(),
  kind: ChallengeKindSchema,
  challenge: z.string(),
  userHandle: z.string().optional(),
  expiresAt: z.date(),
});
export type ChallengeDoc = z.infer<typeof ChallengeDocSchema>;

export const SessionDocSchema = z.object({
  _id: z.string(),
  subject: z.literal("admin"),
  createdAt: z.date(),
  expiresAt: z.date(),
  authStrength: z.enum(["passkey"]),
});
export type SessionDoc = z.infer<typeof SessionDocSchema>;
