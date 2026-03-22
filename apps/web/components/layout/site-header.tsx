"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { categories } from "@vectornews/shared";
import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "../ui/logo";

const PANEL_TRANSITION_MS = 480;

function BurgerButton({
  expanded,
  label,
  onClick
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-gold hover:text-gold lg:hidden"
    >
      <span className="flex w-5 flex-col gap-1.5">
        <span className="h-0.5 w-full rounded-full bg-current" />
        <span className="h-0.5 w-full rounded-full bg-current" />
        <span className="h-0.5 w-full rounded-full bg-current" />
      </span>
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [shouldRenderCategories, setShouldRenderCategories] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsCategoriesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      setShouldRenderMenu(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderMenu(false);
    }, PANEL_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isMenuOpen]);

  useEffect(() => {
    if (isCategoriesOpen) {
      setShouldRenderCategories(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderCategories(false);
    }, PANEL_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isCategoriesOpen]);

  useEffect(() => {
    const hasOpenPanel = isMenuOpen || isCategoriesOpen;
    document.body.style.overflow = hasOpenPanel ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCategoriesOpen, isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <BurgerButton
            expanded={isCategoriesOpen}
            label="Open categories"
            onClick={() => {
              setIsCategoriesOpen((value) => !value);
              setIsMenuOpen(false);
            }}
          />
          <Link href="/" className="min-w-0 shrink">
            <Logo />
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/search"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist transition hover:border-gold hover:text-white"
            >
              Search
            </Link>
            <AuthControls />
          </div>
          <BurgerButton
            expanded={isMenuOpen}
            label="Open menu"
            onClick={() => {
              setIsMenuOpen((value) => !value);
              setIsCategoriesOpen(false);
            }}
          />
        </div>
        <nav className="hidden flex-wrap gap-2 text-sm text-mist lg:flex">
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

      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-all duration-[480ms] ease-out lg:hidden ${
          isMenuOpen || isCategoriesOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => {
          setIsMenuOpen(false);
          setIsCategoriesOpen(false);
        }}
      />

      {shouldRenderCategories ? (
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,22rem)] flex-col border-r border-white/10 bg-[#0b1324]/95 px-4 py-5 shadow-2xl backdrop-blur-xl transition-all duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:hidden ${
            isCategoriesOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-mist">Categories</span>
            <button
              type="button"
              aria-label="Close categories"
              onClick={() => setIsCategoriesOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-gold hover:text-gold"
            >
              x
            </button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <p className="mb-3 text-sm text-white">Browse news by topic</p>
            <nav className="flex max-h-[calc(100vh-10rem)] flex-col gap-2 overflow-y-auto text-sm text-mist">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-white transition hover:border-gold hover:text-gold"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}

      {shouldRenderMenu ? (
        <aside
          className={`fixed inset-y-0 right-0 z-50 flex w-[min(86vw,22rem)] flex-col border-l border-white/10 bg-[#0b1324]/95 px-4 py-5 shadow-2xl backdrop-blur-xl transition-all duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:hidden ${
            isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-mist">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-gold hover:text-gold"
            >
              x
            </button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <p className="mb-3 text-sm text-white">Quick access</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-white transition hover:border-gold hover:text-gold"
              >
                Home
              </Link>
              <Link
                href="/search"
                className="rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-white transition hover:border-gold hover:text-gold"
              >
                Search
              </Link>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <AuthControls />
          </div>
        </aside>
      ) : null}
    </header>
  );
}
