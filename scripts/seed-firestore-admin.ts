import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { hashSync } from "bcryptjs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type CliOptions = {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  collection?: string;
  serviceAccountPath?: string;
  active?: boolean;
};

function parseArgs(argv: string[]) {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--email") options.email = next;
    if (current === "--password") options.password = next;
    if (current === "--name") options.name = next;
    if (current === "--role") options.role = next;
    if (current === "--collection") options.collection = next;
    if (current === "--service-account") options.serviceAccountPath = next;
    if (current === "--inactive") options.active = false;

    if (
      current === "--email" ||
      current === "--password" ||
      current === "--name" ||
      current === "--role" ||
      current === "--collection" ||
      current === "--service-account"
    ) {
      index += 1;
    }
  }

  return options;
}

async function loadServiceAccount(options: CliOptions) {
  const serviceAccountPath =
    options.serviceAccountPath ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const candidatePaths = [
      path.resolve(process.cwd(), serviceAccountPath),
      path.resolve(process.cwd(), path.basename(serviceAccountPath))
    ];
    let resolvedPath: string | undefined;

    for (const candidatePath of candidatePaths) {
      try {
        await access(candidatePath);
        resolvedPath = candidatePath;
        break;
      } catch {
        // Try the next candidate path.
      }
    }

    if (!resolvedPath) {
      throw new Error(
        `Service account file not found: ${serviceAccountPath}. Checked: ${candidatePaths.join(", ")}`
      );
    }

    const raw = await readFile(resolvedPath, "utf8");
    return JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials. Use --service-account <path> or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

async function getDb(options: CliOptions) {
  if (getApps().length === 0) {
    const serviceAccount = await loadServiceAccount(options);
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

function requireOption(value: string | undefined, label: string) {
  if (!value) {
    throw new Error(`Missing required option: ${label}`);
  }
  return value;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const email = requireOption(options.email ?? process.env.ADMIN_EMAIL, "--email");
  const password = requireOption(
    options.password ?? process.env.ADMIN_PASSWORD,
    "--password"
  );
  const name = options.name ?? process.env.ADMIN_NAME ?? "Main Admin";
  const role = options.role ?? process.env.ADMIN_ROLE ?? "admin";
  const collection =
    options.collection ??
    process.env.FIRESTORE_ADMIN_COLLECTION ??
    "admin_users";
  const active = options.active ?? true;

  const db = await getDb(options);
  const normalizedEmail = email.toLowerCase();
  const passwordHash = hashSync(password, 10);

  const existingSnapshot = await db
    .collection(collection)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  const payload = {
    email: normalizedEmail,
    passwordHash,
    active,
    role,
    name,
    updatedAt: new Date().toISOString()
  };

  if (existingSnapshot.empty) {
    const created = await db.collection(collection).add({
      ...payload,
      createdAt: new Date().toISOString()
    });
    console.log(`Created Firestore admin user: ${created.id}`);
  } else {
    const document = existingSnapshot.docs[0];
    await document.ref.set(payload, { merge: true });
    console.log(`Updated Firestore admin user: ${document.id}`);
  }

  console.log(`Collection: ${collection}`);
  console.log(`Email: ${normalizedEmail}`);
  console.log(`Active: ${active}`);
  console.log(`Role: ${role}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
