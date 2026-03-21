"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";

type AuthMode = "login" | "register";

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "Не удалось выполнить авторизацию.";
  }

  if (error.message.includes("auth/invalid-credential")) {
    return "Неверный email или пароль.";
  }
  if (error.message.includes("auth/email-already-in-use")) {
    return "Пользователь с таким email уже существует.";
  }
  if (error.message.includes("auth/weak-password")) {
    return "Пароль должен содержать минимум 6 символов.";
  }
  if (error.message.includes("auth/popup-closed-by-user")) {
    return "Вход через Google был отменен.";
  }
  if (error.message.includes("auth/too-many-requests")) {
    return "Слишком много попыток. Повторите позже.";
  }

  return error.message;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const {
    configured,
    loading,
    user,
    signInWithEmailPassword,
    signInWithGooglePopup,
    signUpWithEmailPassword
  } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
      router.refresh();
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setPending(true);
    setError("");

    try {
      if (mode === "register") {
        await signUpWithEmailPassword(name, email, password);
      } else {
        await signInWithEmailPassword(email, password);
      }
      router.replace("/account");
      router.refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError("");

    try {
      await signInWithGooglePopup();
      router.replace("/account");
      router.refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-240px)] max-w-7xl items-center px-4 py-10 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(216,183,104,0.18),rgba(10,16,32,0.9))] p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.32em] text-gold">
            {isRegister ? "Регистрация" : "Вход"}
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold text-white">
            {isRegister
              ? "Создайте личный кабинет VectorNews"
              : "Войдите в личный кабинет VectorNews"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Сохраняйте персональный профиль, используйте вход через эл. почту и пароль или через
            Google, и переходите в личный кабинет без отдельной админской авторизации.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-mist">
            <span className="rounded-full border border-white/10 px-4 py-2">
              Аутентификация Firebase
            </span>
            <span className="rounded-full border border-white/10 px-4 py-2">
              Эл. почта / Пароль
            </span>
            <span className="rounded-full border border-white/10 px-4 py-2">Вход через Google</span>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#0d1426] p-8">
          <div className="mb-6 flex gap-2">
            <Link
              href="/login"
              className={`rounded-full px-4 py-2 text-sm transition ${
                !isRegister ? "bg-gold text-ink" : "border border-white/10 text-mist"
              }`}
            >
              Вход
            </Link>
            <Link
              href="/register"
              className={`rounded-full px-4 py-2 text-sm transition ${
                isRegister ? "bg-gold text-ink" : "border border-white/10 text-mist"
              }`}
            >
              Регистрация
            </Link>
          </div>

          {!configured ? (
            <div className="rounded-3xl border border-gold/30 bg-gold/10 p-5 text-sm text-white">
              Заполните `NEXT_PUBLIC_FIREBASE_*` и server-side Firebase Admin переменные, чтобы
              включить авторизацию.
            </div>
          ) : null}

          <form className="grid gap-3" onSubmit={handleSubmit}>
            {isRegister ? (
              <input
                name="name"
                type="text"
                placeholder="Ваше имя"
                required
                className="rounded-2xl border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none focus:border-gold"
              />
            ) : null}
            <input
              name="email"
              type="email"
              placeholder="Эл. почта"
              required
              className="rounded-2xl border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none focus:border-gold"
            />
            <input
              name="password"
              type="password"
              placeholder="Пароль"
              required
              minLength={6}
              className="rounded-2xl border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={pending || !configured}
              className="rounded-2xl bg-gold px-4 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Подождите..." : isRegister ? "Создать аккаунт" : "Войти"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending || !configured}
            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-70"
          >
            Продолжить через Google
          </button>

          {error ? <p className="mt-4 text-sm text-gold">{error}</p> : null}

          <p className="mt-6 text-sm text-mist">
            {isRegister ? "Уже есть аккаунт?" : "Еще нет аккаунта?"}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="text-gold">
              {isRegister ? "Войти" : "Зарегистрироваться"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
