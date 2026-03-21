"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const fieldClassName =
  "w-full rounded-[22px] border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none transition focus:border-gold";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email")),
        password: String(formData.get("password"))
      })
    });

    if (!response.ok) {
      setError("Неверный логин или пароль");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 lg:px-8">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Доступ администратора</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Вход в редакционную панель</h1>
        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@vectornews.local"
            className={fieldClassName}
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Пароль"
            className={fieldClassName}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-gold px-5 py-3 font-medium text-ink transition hover:bg-sand disabled:opacity-60"
          >
            {submitting ? "Вход..." : "Войти"}
          </button>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
