"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { User } from "firebase/auth";
import {
  getFirebaseUserIdToken,
  isFirebaseClientConfigured,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebaseUser,
  signUpWithEmail,
  watchFirebaseUser
} from "@/lib/firebase-client";

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (name: string, email: string, password: string) => Promise<void>;
  signInWithGooglePopup: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedTokenRef = useRef<string | null>(null);
  const configured = isFirebaseClientConfigured();

  useEffect(() => {
    const unsubscribe = watchFirebaseUser((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!configured || loading) {
      return;
    }

    let cancelled = false;

    async function syncSession() {
      if (!user) {
        syncedTokenRef.current = null;
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include"
        });
        return;
      }

      const token = await getFirebaseUserIdToken(user);
      if (!token || syncedTokenRef.current === token) {
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ idToken: token })
      });

      if (!response.ok) {
        throw new Error("Unable to synchronize auth session");
      }

      if (!cancelled) {
        syncedTokenRef.current = token;
      }
    }

    syncSession().catch(() => {
      if (!cancelled) {
        syncedTokenRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [configured, loading, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      async signInWithEmailPassword(email, password) {
        await signInWithEmail(email, password);
      },
      async signUpWithEmailPassword(name, email, password) {
        await signUpWithEmail(email, password, name);
      },
      async signInWithGooglePopup() {
        await signInWithGoogle();
      },
      async signOutUser() {
        await signOutFirebaseUser();
      },
      async getIdToken() {
        if (!user) {
          return null;
        }

        return getFirebaseUserIdToken(user);
      }
    }),
    [configured, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
