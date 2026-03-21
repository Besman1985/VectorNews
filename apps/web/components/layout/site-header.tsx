import Link from "next/link";
import { categories } from "@vectornews/shared";
import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "../ui/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist transition hover:border-gold hover:text-white"
            >
              Поиск
            </Link>
            <AuthControls />
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm text-mist">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-full border border-white/10 px-4 py-2 transition hover:border-gold hover:text-white"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
