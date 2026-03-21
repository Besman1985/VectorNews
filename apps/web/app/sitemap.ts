import { articles, categories } from "@vectornews/shared";
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date()
    },
    ...articles.map((article) => ({
      url: `${siteConfig.url}/news/${article.slug}`,
      lastModified: new Date(article.publishedAt)
    })),
    ...categories.map((category) => ({
      url: `${siteConfig.url}/category/${category.slug}`,
      lastModified: new Date()
    }))
  ];
}
