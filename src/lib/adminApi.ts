import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `${path} responded ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`${path} responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export type AdminStatus = {
  hasAdmin: boolean;
  authenticated: boolean;
};

export type AdminMe = {
  authenticated: true;
  credentialCount: number;
  expiresAt: string;
};

export type { ContentDocId } from "@/shared/data/schemas";
import type { ContentDocId } from "@/shared/data/schemas";

export type ZodIssueLite = {
  path: (string | number)[];
  message: string;
};

export class ContentSaveError extends Error {
  readonly code: string;
  readonly issues: ZodIssueLite[];
  constructor(code: string, issues: ZodIssueLite[] = []) {
    const message =
      code === "validation_failed" && issues.length
        ? `Validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"})`
        : code;
    super(message);
    this.name = "ContentSaveError";
    this.code = code;
    this.issues = issues;
  }
}

async function saveContent(
  docId: ContentDocId,
  data: unknown,
): Promise<{ ok: true }> {
  const res = await fetch("/api/admin/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, data }),
    credentials: "same-origin",
  });
  const payload: unknown = await res.json().catch(() => ({}));
  if (res.ok) return payload as { ok: true };
  const obj = (payload ?? {}) as {
    error?: string;
    issues?: ZodIssueLite[];
    message?: string;
  };
  const code = obj.error ?? obj.message ?? `http_${res.status}`;
  const issues = Array.isArray(obj.issues) ? obj.issues : [];
  throw new ContentSaveError(code, issues);
}

const getContent = (docId: ContentDocId) => getJson<unknown>(`/api/${docId}`);

async function resetContent(
  docId: ContentDocId,
): Promise<{ ok: true; data: unknown }> {
  return postJson<{ ok: true; data: unknown }>("/api/admin/content/reset", {
    docId,
  });
}

export const adminApi = {
  status: () => getJson<AdminStatus>("/api/admin/status"),
  me: () => getJson<AdminMe>("/api/admin/me"),
  registerBegin: () =>
    postJson<PublicKeyCredentialCreationOptionsJSON>(
      "/api/admin/register/begin",
    ),
  registerFinish: (response: RegistrationResponseJSON) =>
    postJson<{ ok: true }>("/api/admin/register/finish", response),
  loginBegin: () =>
    postJson<PublicKeyCredentialRequestOptionsJSON>("/api/admin/login/begin"),
  loginFinish: (response: AuthenticationResponseJSON) =>
    postJson<{ ok: true }>("/api/admin/login/finish", response),
  addCredentialBegin: () =>
    postJson<PublicKeyCredentialCreationOptionsJSON>(
      "/api/admin/credentials/add/begin",
    ),
  addCredentialFinish: (response: RegistrationResponseJSON) =>
    postJson<{ ok: true }>("/api/admin/credentials/add/finish", response),
  logout: () => postJson<{ ok: true }>("/api/admin/logout"),
  getContent,
  saveContent,
  resetContent,
};
