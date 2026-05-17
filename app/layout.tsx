import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PaletteSchema } from "@/shared/data/schemas";
import { PaletteProvider } from "@/lib/palette";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, siteUrl } from "@/server/seo";
import "@/styles/index.css";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Instrument+Serif:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Fira+Code:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: HOME_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: HOME_DESCRIPTION,
  verification: {
    google: "nh8ZX_KV_vxCRHYlmYP5ENpNXWkf7eJtpivOpgAVx0M",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    types: { "application/atom+xml": "/feed.xml" },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the palette server-side from the cookie so the first paint already
  // carries the right theme — no flash, no hydration mismatch on <body>.
  const store = await cookies();
  const parsed = PaletteSchema.safeParse(store.get("palette")?.value);
  const palette = parsed.success ? parsed.data : "midnight";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={FONT_HREF} rel="stylesheet" />
      </head>
      <body data-palette={palette} data-type="dmserif" data-motif="high">
        <PaletteProvider
          initialPalette={palette}
          initialHasStored={parsed.success}
        >
          {children}
        </PaletteProvider>
      </body>
    </html>
  );
}
