// services/authService.ts
import type { User as FirebaseUser } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { auth } from "./firebase";

export type User = { uid: string; email: string } | null;

function toUser(u: FirebaseUser | null): User {
  if (!u) return null;
  return { uid: u.uid, email: u.email ?? "" };
}

class FirebaseAuthService {
  onChange(callback: (u: User) => void) {
    // Mantém a mesma assinatura do seu mock: retorna unsubscribe
    return onAuthStateChanged(auth, (fbUser) => callback(toUser(fbUser)));
  }

  getCurrentUser(): User {
    return toUser(auth.currentUser);
  }

  async signUp(email: string, password: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return toUser(cred.user);
  }

  async signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return toUser(cred.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }
}

export const authService = new FirebaseAuthService();
