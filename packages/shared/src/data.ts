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
  }
];

export const articles: NewsArticle[] = [];

export const dashboardStats: DashboardStats = {
  totalArticles: 0,
  totalViews: 0,
  totalComments: 0
};
