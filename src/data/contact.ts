import { z } from "zod";
import { ContactLinkSchema, type ContactLink } from "./schemas";

const links: ContactLink[] = [
  {
    label: "Email",
    value: "osinachi88@outlook.com",
    href: "mailto:osinachi88@outlook.com",
    cta: "Compose",
  },
  {
    label: "Phone",
    value: "+44 (0) 7727 827 640",
    href: "tel:+447727827640",
    cta: "Call",
  },
  {
    label: "GitHub",
    value: "github.com/sianachi",
    href: "https://github.com/sianachi",
    cta: "Visit",
    external: true,
  },
  {
    label: "LinkedIn",
    value: "in/osinachi-nwagboso",
    href: "#",
    cta: "Visit",
  },
  {
    label: "CV",
    value: "Osinachi_Nwagboso_CV.pdf",
    href: "/uploads/Osinachi_Nwagboso_CV-4.pdf",
    cta: "Download",
    external: true,
  },
];

export const CONTACT_LINKS = z.array(ContactLinkSchema).parse(links);

export const COLOPHON_LINES = [
  "MSc Computer Science, Coventry — Distinction",
  "BEng (Hons) Computer Science, Anglia Ruskin — First Class",
  "Software Engineer II · Redspeed International",
  "© Osinachi Nwagboso · All rights reserved",
] as const;
