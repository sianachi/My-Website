import contactContent from "../../content/contact.json" with { type: "json" };
import { ContactContentSchema } from "./schemas.js";

export const CONTACT = ContactContentSchema.parse(contactContent);
export const CONTACT_LINKS = CONTACT.links;
export const COLOPHON_LINES = CONTACT.colophon;
