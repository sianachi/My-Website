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

type FetchOpts = { signal?: AbortSignal; bust?: boolean };

async function getJson<T>(
  path: string,
  parse: (value: unknown) => T,
  opts?: FetchOpts,
): Promise<T> {
  const url = opts?.bust ? `${path}?t=${Date.now()}` : path;
  const res = await fetch(url, {
    signal: opts?.signal,
    cache: opts?.bust ? "no-store" : "default",
  });
  if (!res.ok) {
    throw new Error(`${path} responded ${res.status}`);
  }
  return parse(await res.json());
}

export const api = {
  cover: (opts?: FetchOpts): Promise<CoverContent> =>
    getJson("/api/cover", (v) => CoverContentSchema.parse(v), opts),
  about: (opts?: FetchOpts): Promise<AboutContent> =>
    getJson("/api/about", (v) => AboutContentSchema.parse(v), opts),
  work: (opts?: FetchOpts): Promise<WorkContent> =>
    getJson("/api/work", (v) => WorkContentSchema.parse(v), opts),
  contact: (opts?: FetchOpts): Promise<ContactContent> =>
    getJson("/api/contact", (v) => ContactContentSchema.parse(v), opts),
};

export type SiteContent = {
  cover: CoverContent;
  about: AboutContent;
  work: WorkContent;
  contact: ContactContent;
};

export async function fetchSiteContent(
  opts?: FetchOpts,
): Promise<SiteContent> {
  const [cover, about, work, contact] = await Promise.all([
    api.cover(opts),
    api.about(opts),
    api.work(opts),
    api.contact(opts),
  ]);
  return { cover, about, work, contact };
}
