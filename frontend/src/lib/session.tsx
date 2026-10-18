import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Meta, type User } from "./api";

type Session = {
  user: User | null;
  meta: Meta | null;
  ready: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

/** Holds the signed-in user and the fixed option lists from the backend. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api.me(), api.meta()])
      .then(([me, m]) => {
        setUser(me);
        setMeta(m);
      })
      .catch(() => setMeta(null))
      .finally(() => setReady(true));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return <SessionContext.Provider value={{ user, meta, ready, setUser, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
