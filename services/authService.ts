// services/authService.ts (FIREBASE)
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FbUser,
} from "firebase/auth";
import { auth } from "./firebase";

export type User = { uid: string; email: string } | null;

class FirebaseAuthService {
  private listeners = new Set<(u: User) => void>();

  private mapUser(u: FbUser | null): User {
    if (!u) return null;
    return { uid: u.uid, email: u.email || "" };
  }

  onChange(callback: (u: User) => void) {
    this.listeners.add(callback);

    const unsub = onAuthStateChanged(auth, (u) => {
      const mapped = this.mapUser(u);
      for (const cb of this.listeners) cb(mapped);
    });

    // chama imediatamente com o estado atual
    callback(this.mapUser(auth.currentUser));

    return () => {
      this.listeners.delete(callback);
      unsub();
    };
  }

  getCurrentUser(): User {
    return this.mapUser(auth.currentUser);
  }

  async signUp(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return this.mapUser(cred.user);
  }

  async signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return this.mapUser(cred.user);
  }

  async signOut() {
    await fbSignOut(auth);
  }
}

export const authService = new FirebaseAuthService();
