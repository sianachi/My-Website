import navContent from "../../content/nav.json";
import { NavContentSchema } from "./schemas";

const parsed = NavContentSchema.parse(navContent);

export const NAV_ENTRIES = parsed.entries;
