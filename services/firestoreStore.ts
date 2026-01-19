import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

type Listener = () => void;

class FirestoreStore {
  private uid: string | null = null;
  private listeners: Listener[] = [];

  setUser(uid: string) {
    this.uid = uid;
    this.notify();
  }

  clearUser() {
    this.uid = null;
    this.notify();
  }

  subscribe(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // ===== TRANSACTIONS =====
  async addTransaction(data: any) {
    if (!this.uid) return;
    await addDoc(collection(db, "transactions"), {
      ...data,
      userId: this.uid,
    });
    this.notify();
  }

  async getTransactions() {
    if (!this.uid) return [];
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", this.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(db, "transactions", id));
    this.notify();
  }
}

export const store = new FirestoreStore();
