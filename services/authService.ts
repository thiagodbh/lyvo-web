import { store } from "./mockStore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

export const authService = {
  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  },

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  signOut() {
    return signOut(auth);
  },

  onChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      store.setUser(user.uid); // 🔴 LINHA NOVA
    } else {
      store.clearUser();       // 🔴 LINHA NOVA
    }
    callback(user);
  });
},
};
