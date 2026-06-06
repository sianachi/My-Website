import type { Metadata } from "next";
import { HomeClient } from "@/screens/HomeClient";
import { JsonLd } from "@/components/JsonLd";
import { getSiteContent } from "@/server/content";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_NAME,
  absoluteUrl,
} from "@/server/seo";

// Content lives in MongoDB and is edited live via the admin console, so the
// page is server-rendered per request (no build-time prerender — the build
// container has no database).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  jobTitle: "Backend Engineer",
  url: absoluteUrl("/"),
  address: {
    "@type": "PostalAddress",
    addressLocality: "Birmingham",
    addressCountry: "UK",
  },
};

export default async function HomePage() {
  const content = await getSiteContent();
  return (
    <>
      <JsonLd data={PERSON_JSON_LD} />
      <HomeClient initialContent={content} />
    </>
  );
}
