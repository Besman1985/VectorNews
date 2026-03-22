import "server-only";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function pathExists(candidatePath: string) {
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
    configuredPath ? path.resolve(process.cwd(), configuredPath) : null,
    path.resolve(process.cwd(), "firebase-adminsdk.json"),
    path.resolve(process.cwd(), "..", "..", "firebase-adminsdk.json")
  ].filter((value): value is string => Boolean(value));

  for (const candidatePath of candidatePaths) {
    if (await pathExists(candidatePath)) {
      const raw = await readFile(candidatePath, "utf8");
      return JSON.parse(raw) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

async function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = await loadServiceAccount();

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    })
  });
}

export async function getAdminDb() {
  return getFirestore(await getFirebaseAdminApp());
}

export async function getAdminAuth() {
  return getAuth(await getFirebaseAdminApp());
}
