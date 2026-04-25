import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { adminApi } from "@/lib/adminApi";

export type AdminAuthStatus =
  | { state: "loading" }
  | { state: "needs-registration" }
  | { state: "needs-login" }
  | { state: "authenticated"; credentialCount: number }
  | { state: "error"; error: Error };

type AdminAuthActions = {
  register: () => Promise<void>;
  login: () => Promise<void>;
  addCredential: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
};

type AdminAuthValue = {
  status: AdminAuthStatus;
} & AdminAuthActions;

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAuthStatus>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus({ state: "loading" });
    (async () => {
      try {
        const s = await adminApi.status();
        if (cancelled) return;
        if (!s.hasAdmin) {
          setStatus({ state: "needs-registration" });
        } else if (!s.authenticated) {
          setStatus({ state: "needs-login" });
        } else {
          const me = await adminApi.me();
          if (cancelled) return;
          setStatus({
            state: "authenticated",
            credentialCount: me.credentialCount,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setStatus({
          state: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const register = useCallback(async () => {
    const options = await adminApi.registerBegin();
    const response = await startRegistration({ optionsJSON: options });
    await adminApi.registerFinish(response);
    const me = await adminApi.me();
    setStatus({
      state: "authenticated",
      credentialCount: me.credentialCount,
    });
  }, []);

  const login = useCallback(async () => {
    const options = await adminApi.loginBegin();
    const response = await startAuthentication({ optionsJSON: options });
    await adminApi.loginFinish(response);
    const me = await adminApi.me();
    setStatus({
      state: "authenticated",
      credentialCount: me.credentialCount,
    });
  }, []);

  const addCredential = useCallback(async () => {
    const options = await adminApi.addCredentialBegin();
    const response = await startRegistration({ optionsJSON: options });
    await adminApi.addCredentialFinish(response);
    const me = await adminApi.me();
    setStatus({
      state: "authenticated",
      credentialCount: me.credentialCount,
    });
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout();
    setStatus({ state: "needs-login" });
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ status, register, login, addCredential, logout, refresh }),
    [status, register, login, addCredential, logout, refresh],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be called inside <AdminAuthProvider>");
  }
  return ctx;
}
