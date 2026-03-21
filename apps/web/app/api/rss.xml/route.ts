import { getArticles } from "@/lib/content-api";
import { siteConfig } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const articles = await getArticles();

  const items = articles
    .map(
      (article) => `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${escapeXml(`${siteConfig.url}/news/${article.slug}`)}</link>
          <guid>${escapeXml(`${siteConfig.url}/news/${article.slug}`)}</guid>
          <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
          <description>${escapeXml(article.excerpt)}</description>
        </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>${escapeXml(siteConfig.name)}</title>
        <link>${escapeXml(siteConfig.url)}</link>
        <description>${escapeXml(siteConfig.description)}</description>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
