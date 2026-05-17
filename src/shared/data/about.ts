import aboutContent from "../../content/about.json" with { type: "json" };
import { AboutContentSchema } from "./schemas";

export const ABOUT = AboutContentSchema.parse(aboutContent);
