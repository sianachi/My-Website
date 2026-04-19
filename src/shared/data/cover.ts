import coverContent from "../../content/cover.json" with { type: "json" };
import { CoverContentSchema } from "./schemas.js";

export const COVER = CoverContentSchema.parse(coverContent);
