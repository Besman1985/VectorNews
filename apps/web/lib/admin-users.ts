import "server-only";
import { compareSync } from "bcryptjs";
import { getAdminDb } from "./firebase-admin";

export interface FirestoreAdminUser {
  id: string;
  email: string;
  passwordHash: string;
  active: boolean;
  role?: string;
  name?: string;
}

const collectionName = process.env.FIRESTORE_ADMIN_COLLECTION ?? "admin_users";

export async function getAdminUserByEmail(email: string) {
  const snapshot = await getAdminDb()
    .collection(collectionName)
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];
  const data = document.data() as Omit<FirestoreAdminUser, "id">;
  return {
    id: document.id,
    ...data
  };
}

export async function validateAdminCredentials(email: string, password: string) {
  const adminUser = await getAdminUserByEmail(email);

  if (!adminUser || !adminUser.active || !adminUser.passwordHash) {
    return null;
  }

  const isValid = compareSync(password, adminUser.passwordHash);
  if (!isValid) {
    return null;
  }

  return adminUser;
}
