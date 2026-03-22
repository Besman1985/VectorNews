import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8">
      <div className="rounded-[36px] border border-white/10 bg-white/5 p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">404</p>
        <h1 className="heading-page mt-4 font-semibold text-white">Материал не найден</h1>
        <p className="mt-4 text-lg text-slate-300">
          Страница была удалена, перемещена или URL указан некорректно.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-2xl bg-gold px-5 py-3 font-medium text-ink"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
