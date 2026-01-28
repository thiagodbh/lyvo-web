// services/authService.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth } from "./firebase";

class FirebaseAuthService {
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async signUp(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async signOut() {
    await signOut(auth);
  }
}

export const authService = new FirebaseAuthService();
