import workContent from "@/content/work.json";
import { WorkContentSchema } from "./schemas";

export const WORK = WorkContentSchema.parse(workContent);
export const WORK_CARDS = WORK.cards;
