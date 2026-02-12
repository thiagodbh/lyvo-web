// services/authService.ts
import type { User as FirebaseUser } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { auth, db } from "./firebase";

// ✅ ADICIONAR ESTES IMPORTS
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

export type User = { uid: string; email: string } | null;

function toUser(u: FirebaseUser | null): User {
  if (!u) return null;
  return { uid: u.uid, email: u.email ?? "" };
}

// ✅ ADICIONAR ESTA FUNÇÃO (cria userDoc se não existir)
async function ensureUserDoc(uid: string, email: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return;

  const trialEnds = Timestamp.fromDate(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  );

  await setDoc(ref, {
    email,
    active: false,
    plan: "trial",
    createdAt: serverTimestamp(),
    trialEndsAt: trialEnds,
  });
}

class FirebaseAuthService {
  onChange(callback: (u: User) => void) {
    return onAuthStateChanged(auth, (fbUser) => callback(toUser(fbUser)));
  }

  getCurrentUser(): User {
    return toUser(auth.currentUser);
  }

  // ✅ ALTERAR: agora o signup cria o doc users/{uid}
  async signUp(email: string, password: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // ✅ CRIA users/{uid} (trial)
    await ensureUserDoc(cred.user.uid, cred.user.email ?? email);

    return toUser(cred.user);
  }

  // ✅ ALTERAR: no login, se o doc não existir (contas antigas), cria também
  async signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    await ensureUserDoc(cred.user.uid, cred.user.email ?? email);

    return toUser(cred.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }
}

export const authService = new FirebaseAuthService();
