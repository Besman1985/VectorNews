import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DEFAULT_COLLECTION_CANDIDATES = [
  "Editor'sСhoice",
  "Editor'sChoice",
  "EditorsChoice",
  "Editors'Choice"
];
const DEFAULT_DOCUMENT_CANDIDATES = ["Data", "data"];
const DEFAULT_FIELD_CANDIDATES = ["Posts", "posts"];

async function pathExists(candidatePath) {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function loadServiceAccount() {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidatePaths = [
    configuredPath ? path.resolve(ROOT_DIR, configuredPath) : null,
    configuredPath ? path.resolve(process.cwd(), configuredPath) : null,
    path.resolve(ROOT_DIR, "firebase-adminsdk.json")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (await pathExists(candidatePath)) {
      const raw = await readFile(candidatePath, "utf8");
      return JSON.parse(raw);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase credentials.");
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

async function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = await loadServiceAccount();
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key
      })
    });
  }

  return getFirestore();
}

function getCandidates(rawValue, defaults) {
  if (!rawValue) {
    return defaults;
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlugs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const slugs = [];
  const seen = new Set();

  for (const item of value) {
    const slug =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && typeof item.slug === "string"
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

async function main() {
  const db = await getDb();
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
        const slugs = normalizeSlugs(data[fieldName]);
        if (slugs.length > 0) {
          console.log(JSON.stringify(slugs));
          return;
        }
      }
    }
  }

  console.log("[]");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
