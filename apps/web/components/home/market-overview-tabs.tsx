"use client";

import { useState } from "react";
import type { MarketCategory, MarketItem, MarketOverview } from "@/lib/market-data";

const tabs: Array<{ key: MarketCategory; label: string }> = [
  { key: "indices", label: "Индексы" },
  { key: "forex", label: "Валюты" },
  { key: "crypto", label: "Криптовалюты" }
];

function formatPrice(item: MarketItem) {
  if (item.price === 0) {
    return "Нет данных";
  }

  const maximumFractionDigits =
    item.price >= 1000 ? 2 : item.price >= 100 ? 3 : item.price >= 1 ? 4 : 6;

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(item.price);

  return item.suffix ? `${formatted} ${item.suffix}` : formatted;
}

function formatChange(changePercent: number | null) {
  if (changePercent === null || Number.isNaN(changePercent)) {
    return "спот";
  }

  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function MarketOverviewTabs({ overview }: { overview: MarketOverview }) {
  const [activeTab, setActiveTab] = useState<MarketCategory>("indices");
  const items = overview.categories[activeTab] ?? [];

  return (
    <aside className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,12,24,0.92),rgba(15,23,42,0.88))] p-6 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Рынки</p>
          <h2 className="heading-section mt-3 font-semibold text-white">
            Курсы валют, индексов и криптовалют
          </h2>
        </div>
        {overview.updatedAt ? (
          <p className="text-right text-xs text-mist">Обновлено {formatUpdatedAt(overview.updatedAt)}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-gold bg-gold text-ink"
                  : "border-white/10 bg-white/5 text-mist hover:border-gold/40 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3">
        {items.map((item) => {
          const positive = (item.changePercent ?? 0) > 0;
          const negative = (item.changePercent ?? 0) < 0;

          return (
            <div
              key={item.name}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-mist">{item.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-white">{formatPrice(item)}</p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-mist"
                  }`}
                >
                  {formatChange(item.changePercent)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
