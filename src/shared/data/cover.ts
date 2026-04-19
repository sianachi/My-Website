import coverContent from "../../content/cover.json";
import { CoverContentSchema } from "./schemas";

export const COVER = CoverContentSchema.parse(coverContent);
