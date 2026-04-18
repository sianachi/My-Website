import { z } from "zod";
import { NavEntrySchema, type NavEntry } from "./schemas";

const entries: NavEntry[] = [
  { id: "cover", page: "01", label: "Home" },
  { id: "about", page: "02", label: "About" },
  { id: "work", page: "03", label: "Work" },
  { id: "contact", page: "04", label: "Contact" },
];

export const NAV_ENTRIES = z.array(NavEntrySchema).parse(entries);
