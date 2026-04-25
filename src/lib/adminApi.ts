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
};
