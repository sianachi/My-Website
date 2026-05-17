import type { Metadata } from "next";
import { CoreClient } from "@/screens/CoreClient";

export const metadata: Metadata = {
  title: "Core",
  robots: { index: false, follow: false },
};

export default function CorePage() {
  return <CoreClient />;
}
