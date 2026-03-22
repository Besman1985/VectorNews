"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.includes("auth/configuration-not-found")) {
      return "Аутентификация Firebase еще не настроена.";
    }
    return error.message;
  }

  return "Не удалось выполнить действие.";
}

export function AuthControls() {
  const router = useRouter();
  const { configured, loading, user, signOutUser } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setPending(true);
    setError("");

    try {
      await signOutUser();
      router.push("/");
      router.refresh();
    } catch (signOutError) {
      setError(getErrorMessage(signOutError));
    } finally {
      setPending(false);
    }
  }

  if (!configured) {
    return (
      <Link
        href="/register"
        className="rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-2 text-sm text-white transition hover:border-gold hover:text-gold lg:rounded-full lg:bg-transparent lg:text-mist lg:hover:text-white"
      >
        Регистрация
      </Link>
    );
  }

  if (loading) {
    return (
      <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist">
        Авторизация...
      </span>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-gold hover:text-gold"
        >
          Вход
        </Link>
        <Link
          href="/register"
          className="rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-2 text-sm font-medium text-white transition hover:border-gold hover:text-gold lg:rounded-full lg:border-transparent lg:bg-gold lg:text-ink lg:hover:bg-sand lg:hover:text-ink"
        >
          Регистрация
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-gold hover:text-gold sm:inline-flex"
      >
        {user.displayName || "Кабинет"}
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-70"
      >
        Выйти
      </button>
      {error ? <p className="hidden text-sm text-gold lg:block">{error}</p> : null}
    </div>
  );
}
