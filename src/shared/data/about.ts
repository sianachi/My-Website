import aboutContent from "../../content/about.json";
import { AboutContentSchema } from "./schemas";

export const ABOUT = AboutContentSchema.parse(aboutContent);
