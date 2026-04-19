import workContent from "../../content/work.json" with { type: "json" };
import { WorkContentSchema } from "./schemas.js";

export const WORK = WorkContentSchema.parse(workContent);
export const WORK_CARDS = WORK.cards;
