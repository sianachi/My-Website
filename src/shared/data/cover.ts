import coverContent from "../../content/cover.json" with { type: "json" };
import { CoverContentSchema } from "./schemas";

export const COVER = CoverContentSchema.parse(coverContent);
