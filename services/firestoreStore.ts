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
  private transactions: any[] = [];
  setUser(uid: string) {
    this.uid = uid;
    this.notify();
    getTransactionsByMonth(month: number, year: number) {
  return this.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

calculateBalances(month: number, year: number) {
  const monthTransactions = this.getTransactionsByMonth(month, year);

  const income = monthTransactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.value || 0), 0);

  const expense = monthTransactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.value || 0), 0);

  const allTransactions = this.transactions.filter(t => !t.relatedCardId);

  const totalIncome = allTransactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.value || 0), 0);

  const totalExpense = allTransactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.value || 0), 0);

  return { income, expense, balance: totalIncome - totalExpense };
}

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
this.transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
return this.transactions;

  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(db, "transactions", id));
    this.notify();
  }
}

export const store = new FirestoreStore();
