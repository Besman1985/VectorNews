import type { Category, DashboardStats, NewsArticle } from "./types";

export const categories: Category[] = [
  {
    id: "cat-world",
    name: "Мир",
    slug: "world",
    description: "Глобальные события, дипломатия и международная повестка.",
    color: "#d7b56d"
  },
  {
    id: "cat-technology",
    name: "Технологии",
    slug: "technology",
    description: "AI, разработки, инфраструктура и цифровые продукты.",
    color: "#9bc2ff"
  },
  {
    id: "cat-politics",
    name: "Политика",
    slug: "politics",
    description: "Выборы, институты власти и стратегические решения.",
    color: "#f0d38b"
  },
  {
    id: "cat-economy",
    name: "Экономика",
    slug: "economy",
    description: "Макроэкономика, рынки и глобальные тренды.",
    color: "#89d8c7"
  },
  {
    id: "cat-business",
    name: "Бизнес",
    slug: "business",
    description: "Компании, сделки, инвестиции и управленческие решения.",
    color: "#d4a95e"
  },
  {
    id: "cat-sport",
    name: "Спорт",
    slug: "sport",
    description: "Главные матчи, трансферы и аналитика соревнований.",
    color: "#ff8f6b"
  },
  {
    id: "cat-science",
    name: "Наука",
    slug: "science",
    description: "Исследования, открытия и научные прорывы.",
    color: "#b0a3ff"
  },
  {
    id: "cat-crypto",
    name: "\u041a\u0440\u0438\u043f\u0442\u043e",
    slug: "crypto",
    description:
      "\u041a\u0440\u0438\u043f\u0442\u043e\u0432\u0430\u043b\u044e\u0442\u044b, \u0431\u043b\u043e\u043a\u0447\u0435\u0439\u043d, \u0442\u043e\u043a\u0435\u043d\u044b \u0438 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0446\u0438\u0444\u0440\u043e\u0432\u044b\u0445 \u0430\u043a\u0442\u0438\u0432\u043e\u0432.",
    color: "#f59e0b"
  }
];

export const articles: NewsArticle[] = [];

export const dashboardStats: DashboardStats = {
  totalArticles: 0,
  totalViews: 0,
  totalComments: 0
};
