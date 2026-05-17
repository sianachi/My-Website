"use client";

import { useRouter } from "next/navigation";
import { usePalette } from "@/hooks/usePalette";
import { InteractivePortfolio } from "@/screens/InteractivePortfolio";

export function InteractiveClient() {
  const router = useRouter();
  const { toggle } = usePalette();
  return (
    <InteractivePortfolio
      onBack={() => router.push("/")}
      onThemeToggle={toggle}
    />
  );
}
