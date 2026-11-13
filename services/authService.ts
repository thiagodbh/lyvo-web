// services/authService.ts
import type { User as FirebaseUser } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

import { auth, db } from "./firebase";
import { getAcquisition } from "./acquisition";

export type User = { uid: string; email: string } | null;

export type SignUpProfile = {
  name?: string;
  phone?: string;
  birthDate?: string;
  city?: string;
  state?: string;
  gender?: string;
  profession?: string;
  income?: string;
};

const TRIAL_DAYS = 3;

function toUser(u: FirebaseUser | null): User {
  if (!u) return null;
  return { uid: u.uid, email: u.email ?? "" };
}

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Cria users/{uid} UMA vez, já com perfil + origem do cadastro.
 * Antes o doc era criado só com e-mail e o perfil nunca era gravado (bug que zerava o admin).
 */
async function ensureUserDoc(uid: string, email: string, profile?: SignUpProfile) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // conta antiga sem perfil: completa só o que estiver vazio
    if (profile) {
      const cur = snap.data();
      const patch: Record<string, string> = {};
      (Object.keys(profile) as (keyof SignUpProfile)[]).forEach((k) => {
        const v = clean(profile[k]);
        if (v && !cur[k]) patch[k] = v;
      });
      if (Object.keys(patch).length) await setDoc(ref, patch, { merge: true });
    }
    return;
  }

  await setDoc(ref, {
    email: email.toLowerCase(),
    name: clean(profile?.name),
    phone: clean(profile?.phone, 30),
    birthDate: clean(profile?.birthDate, 10),
    city: clean(profile?.city),
    state: clean(profile?.state, 2).toUpperCase(),
    gender: clean(profile?.gender, 30),
    profession: clean(profile?.profession),
    income: clean(profile?.income, 30),
    acquisition: getAcquisition(),
    active: false,
    plan: "trial",
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromDate(new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)),
  });
}

class FirebaseAuthService {
  onChange(callback: (u: User) => void) {
    return onAuthStateChanged(auth, (fbUser) => callback(toUser(fbUser)));
  }

  getCurrentUser(): User {
    return toUser(auth.currentUser);
  }

  async signUp(email: string, password: string, profile?: SignUpProfile): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserDoc(cred.user.uid, cred.user.email ?? email, profile);
    return toUser(cred.user);
  }

  async signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserDoc(cred.user.uid, cred.user.email ?? email);
    return toUser(cred.user);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }
}

export const authService = new FirebaseAuthService();
