import "server-only";
import { getAdminDb } from "./firebase-admin";

const DEFAULT_COLLECTION_CANDIDATES = [
  "Editor'sСhoice",
  "Editor'sChoice",
  "EditorsChoice",
  "Editors'Choice"
];
const DEFAULT_DOCUMENT_CANDIDATES = ["Data", "data"];
const DEFAULT_FIELD_CANDIDATES = ["Posts", "posts"];

function getCandidates(rawValue: string | undefined, defaults: string[]) {
  if (!rawValue) {
    return defaults;
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlugs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const slugs: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const slug =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "slug" in item && typeof item.slug === "string"
          ? item.slug
          : null;

    const normalizedSlug = slug?.trim();
    if (!normalizedSlug || seen.has(normalizedSlug)) {
      continue;
    }

    seen.add(normalizedSlug);
    slugs.push(normalizedSlug);
  }

  return slugs;
}

export async function getEditorChoiceSlugs() {
  try {
    const db = await getAdminDb();
    const collectionCandidates = getCandidates(
      process.env.FIRESTORE_EDITORS_CHOICE_COLLECTION,
      DEFAULT_COLLECTION_CANDIDATES
    );
    const documentCandidates = getCandidates(
      process.env.FIRESTORE_EDITORS_CHOICE_DOCUMENT,
      DEFAULT_DOCUMENT_CANDIDATES
    );
    const fieldCandidates = getCandidates(
      process.env.FIRESTORE_EDITORS_CHOICE_FIELD,
      DEFAULT_FIELD_CANDIDATES
    );

    for (const collectionName of collectionCandidates) {
      for (const documentId of documentCandidates) {
        const snapshot = await db.collection(collectionName).doc(documentId).get();
        if (!snapshot.exists) {
          continue;
        }

        const data = snapshot.data() ?? {};
        for (const fieldName of fieldCandidates) {
          const slugs = normalizeSlugs(data[fieldName as keyof typeof data]);
          if (slugs.length > 0) {
            return slugs;
          }
        }
      }
    }
  } catch {
    return [];
  }

  return [];
}
