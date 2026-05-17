import type { Metadata } from "next";
import { InteractiveClient } from "@/screens/InteractiveClient";

export const metadata: Metadata = {
  title: "Interactive Portfolio",
  description: "A keyboard-driven, playable take on the portfolio.",
  alternates: { canonical: "/interactive" },
};

export default function InteractivePage() {
  return <InteractiveClient />;
}
