"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

export function AccountPage({
  initialUser
}: {
  initialUser: { name: string; email: string; uid: string; picture?: string | null };
}) {
  const router = useRouter();
  const { signOutUser } = useAuth();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);

    try {
      await signOutUser();
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(216,183,104,0.18),rgba(10,16,32,0.9))] p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-gold">Личный кабинет</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            {initialUser.name || initialUser.email}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Аккаунт авторизован через Firebase. Здесь можно выводить персональные данные,
            сохранённые статьи, подписки и пользовательские действия.
          </p>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#0d1426] p-8">
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-[#0c1324] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-mist">UID</p>
              <p className="mt-2 break-all text-sm text-white">{initialUser.uid}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0c1324] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-mist">Эл. почта</p>
              <p className="mt-2 text-sm text-white">{initialUser.email}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0c1324] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-mist">Имя</p>
              <p className="mt-2 text-sm text-white">{initialUser.name || "Не указано"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="mt-6 rounded-2xl bg-gold px-5 py-3 font-medium text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-70"
          >
            Выйти из кабинета
          </button>
        </div>
      </section>
    </main>
  );
}
