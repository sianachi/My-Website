import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminApi } from "@/lib/adminApi";

type AdminAwareValue = {
  isAdmin: boolean;
  ready: boolean;
};

const AdminAwareContext = createContext<AdminAwareValue>({
  isAdmin: false,
  ready: false,
});

export function AdminAwareProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AdminAwareValue>({
    isAdmin: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .status()
      .then((s) => {
        if (cancelled) return;
        setValue({ isAdmin: Boolean(s.authenticated), ready: true });
      })
      .catch(() => {
        if (cancelled) return;
        setValue({ isAdmin: false, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminAwareContext.Provider value={value}>
      {children}
    </AdminAwareContext.Provider>
  );
}

export function useIsAdmin(): boolean {
  return useContext(AdminAwareContext).isAdmin;
}
