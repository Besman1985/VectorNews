const hashtagPattern = /#([^\s#,]+)/g;

function splitRawTags(tags: string[] | string): string[] {
  if (typeof tags === "string") {
    const extracted = Array.from(tags.matchAll(hashtagPattern), ([, tag]) => tag.trim());
    if (extracted.length > 0) {
      return extracted;
    }

    return tags
      .split(/[\n,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return tags.flatMap((tag) => splitRawTags(tag));
}

export function normalizeTags(tags: string[] | string): string[] {
  const rawTags = splitRawTags(tags);
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of rawTags) {
    const tag = rawTag.trim().replace(/^#+/, "").trim();
    if (!tag) {
      continue;
    }

    const key = tag.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

export function formatTagLabel(tag: string) {
  return `#${tag.trim().replace(/^#+/, "").trim()}`;
}
