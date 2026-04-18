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

export const NavEntrySchema = z.object({
  id: z.string(),
  page: z.string().regex(/^\d{2}$/),
  label: z.string(),
});
export type NavEntry = z.infer<typeof NavEntrySchema>;

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

export const ContactLinkSchema = z.object({
  label: z.string(),
  value: z.string(),
  href: z.string(),
  cta: z.string(),
  external: z.boolean().optional(),
});
export type ContactLink = z.infer<typeof ContactLinkSchema>;

export const ColophonLineSchema = z.union([
  z.string(),
  z.object({ kind: z.literal("html"), html: z.string() }),
]);
export type ColophonLine = z.infer<typeof ColophonLineSchema>;
