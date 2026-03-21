"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};

function hasRequiredFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

export function isFirebaseClientConfigured() {
  return hasRequiredFirebaseConfig();
}

function getFirebaseApp() {
  if (!hasRequiredFirebaseConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

let persistenceConfigured = false;

async function ensureAuthPersistence() {
  const auth = getFirebaseAuth();
  if (!auth || persistenceConfigured) {
    return auth;
  }

  await setPersistence(auth, browserLocalPersistence);
  persistenceConfigured = true;
  return auth;
}

export function watchFirebaseUser(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const auth = await ensureAuthPersistence();
  if (!auth) {
    throw new Error("Firebase client config is missing");
  }

  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = await ensureAuthPersistence();
  if (!auth) {
    throw new Error("Firebase client config is missing");
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const auth = await ensureAuthPersistence();
  if (!auth) {
    throw new Error("Firebase client config is missing");
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const trimmedName = displayName.trim();

  if (trimmedName) {
    await updateProfile(credential.user, { displayName: trimmedName });
  }

  return credential;
}

export async function getFirebaseUserIdToken(user: User, forceRefresh = false) {
  return user.getIdToken(forceRefresh);
}

export async function signOutFirebaseUser() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }
  await signOut(auth);
}
