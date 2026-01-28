// services/authService.ts
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";

export type User = { uid: string; email: string } | null;

class FirebaseAuthService {
  onChange(callback: (u: User) => void) {
    return onAuthStateChanged(auth, (u: FirebaseUser | null) => {
      callback(u ? { uid: u.uid, email: u.email ?? "" } : null);
    });
  }

  getCurrentUser(): User {
    const u = auth.currentUser;
    return u ? { uid: u.uid, email: u.email ?? "" } : null;
  }

  async signIn(email: string, password: string) {
    // “ficar logado”
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }

  async signUp(email: string, password: string) {
    await setPersistence(auth, browserLocalPersistence);
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async signOut() {
    await signOut(auth);
  }
}

export const authService = new FirebaseAuthService();
