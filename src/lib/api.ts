import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  type AboutContent,
  type ContactContent,
  type CoverContent,
  type WorkContent,
} from "@/shared/data/schemas";

async function getJson<T>(
  path: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) {
    throw new Error(`${path} responded ${res.status}`);
  }
  return parse(await res.json());
}

export const api = {
  cover: (signal?: AbortSignal): Promise<CoverContent> =>
    getJson("/api/cover", (v) => CoverContentSchema.parse(v), signal),
  about: (signal?: AbortSignal): Promise<AboutContent> =>
    getJson("/api/about", (v) => AboutContentSchema.parse(v), signal),
  work: (signal?: AbortSignal): Promise<WorkContent> =>
    getJson("/api/work", (v) => WorkContentSchema.parse(v), signal),
  contact: (signal?: AbortSignal): Promise<ContactContent> =>
    getJson("/api/contact", (v) => ContactContentSchema.parse(v), signal),
};

export type SiteContent = {
  cover: CoverContent;
  about: AboutContent;
  work: WorkContent;
  contact: ContactContent;
};

export async function fetchSiteContent(
  signal?: AbortSignal,
): Promise<SiteContent> {
  const [cover, about, work, contact] = await Promise.all([
    api.cover(signal),
    api.about(signal),
    api.work(signal),
    api.contact(signal),
  ]);
  return { cover, about, work, contact };
}
