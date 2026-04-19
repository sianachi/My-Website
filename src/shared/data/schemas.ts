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

export const PillarSchema = z.object({
  no: z.string(),
  heading: z.string(),
  body: z.string(),
});

export const AboutStackEntrySchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const AboutContentSchema = z.object({
  pageHead: PageBandSchema,
  pageFoot: PageBandSchema,
  premise: z.object({
    label: z.string(),
    heading: z.string(),
  }),
  bio: z.object({
    lede: z.string(),
    paragraphs: z.array(z.string()).min(1),
  }),
  pillars: z.array(PillarSchema).min(1),
  stack: z.array(AboutStackEntrySchema).min(1),
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
  introLabel: z.string(),
  introHeading: z.string(),
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
  signalLabel: z.string(),
  heading: z.string(),
  signoffLabel: z.string(),
  signoff: z.string(),
  sig: z.string(),
  links: z.array(ContactLinkSchema).min(1),
  colophon: z.array(z.string()).min(1),
  interactiveLinkLabel: z.string(),
});
export type ContactContent = z.infer<typeof ContactContentSchema>;
