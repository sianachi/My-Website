import aboutContent from "../../content/about.json" with { type: "json" };
import { AboutContentSchema } from "./schemas.js";

export const ABOUT = AboutContentSchema.parse(aboutContent);
