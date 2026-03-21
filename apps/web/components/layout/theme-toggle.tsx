"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("vectornews-theme") as
      | "dark"
      | "light"
      | null;
    const nextTheme = storedTheme ?? "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("vectornews-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-gold hover:text-gold"
    >
      {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}
