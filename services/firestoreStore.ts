// services/firestoreStore.ts
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";

import {
  Transaction,
  FixedBill,
  CreditCard,
  Forecast,
  BudgetLimit,
  CalendarEvent,
  CalendarConnection,
} from "../types";

import { db } from "./firebase";

const DEFAULT_CREDIT_CARDS: Omit<CreditCard, "id">[] = [
  {
    name: "Nubank",
    limit: 5000,
    dueDay: 10,
    bestPurchaseDay: 3,
    color: "bg-purple-600",
    brand: "mastercard",
    paidInvoices: [],
  },
  {
    name: "Inter",
    limit: 3000,
    dueDay: 15,
    bestPurchaseDay: 8,
    color: "bg-orange-500",
    brand: "mastercard",
    paidInvoices: [],
  },
];

const DEFAULT_BUDGET_LIMITS: Omit<BudgetLimit, "id">[] = [
  { category: "Alimentação", monthlyLimit: 800.0, spent: 0 },
  { category: "Moradia", monthlyLimit: 2000.0, spent: 0 },
  { category: "Transporte", monthlyLimit: 300.0, spent: 0 },
  { category: "Lazer", monthlyLimit: 400.0, spent: 0 },
  { category: "Saúde", monthlyLimit: 500.0, spent: 0 },
  { category: "Outros", monthlyLimit: 200.0, spent: 0 },
];

type Unsub = () => void;

class FirestoreStore {
  transactions: Transaction[] = [];
  fixedBills: FixedBill[] = [];
  creditCards: CreditCard[] = [];
  forecasts: Forecast[] = [];
  budgetLimits: BudgetLimit[] = [];
  events: CalendarEvent[] = [];
  calendarConnections: CalendarConnection[] = [];

  private uid: string | null = null;
  private unsubs: Unsub[] = [];
  private seeded = false;

  setUser(uid: string) {
    if (this.uid === uid) return;
    this.clearSubscriptions();
    this.uid = uid;
    this.startSubscriptions();
    this.seedDefaultsOnce().catch(() => {});
  }

  clearUser() {
    this.uid = null;
    this.clearSubscriptions();
    this.transactions = [];
    this.fixedBills = [];
    this.creditCards = [];
    this.forecasts = [];
    this.budgetLimits = [];
    this.events = [];
    this.calendarConnections = [];
    this.seeded = false;
  }

  private clearSubscriptions() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  private col(name: string) {
    return collection(db, name);
  }

  private qByUid(name: string) {
    if (!this.uid) return null;
    return query(this.col(name), where("uid", "==", this.uid));
  }

  private startSubscriptions() {
    if (!this.uid) return;

    const bind = <T>(colName: string, assign: (items: T[]) => void) => {
      const q = this.qByUid(colName);
      if (!q) return;
      const unsub = onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as T[];
        assign(items);
        window.dispatchEvent(new Event("lyvo:data-changed"));
      });
      this.unsubs.push(unsub);
    };

    bind<Transaction>("transactions", (items) => {
      this.transactions = items.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    bind<FixedBill>("fixedBills", (items) => (this.fixedBills = items));
    bind<CreditCard>("creditCards", (items) => (this.creditCards = items));
    bind<Forecast>("forecasts", (items) => (this.forecasts = items));
    bind<BudgetLimit>("budgetLimits", (items) => (this.budgetLimits = items));
    bind<CalendarConnection>("calendarConnections", (items) => (this.calendarConnections = items));

    // Assinatura de Eventos corrigida para o caminho users/uid/events
    const eventsCol = collection(db, "users", this.uid, "events");
    const unsubEvents = onSnapshot(eventsCol, (snap) => {
      this.events = snap.docs.map(d => ({ 
        id: d.id, 
        ...(d.data() as any) 
      })) as CalendarEvent[];
      window.dispatchEvent(new Event("lyvo:data-changed"));
    });
    this.unsubs.push(unsubEvents);
  }

  private async seedDefaultsOnce() {
    if (!this.uid || this.seeded) return;
    this.seeded = true;

    const ccSnap = await getDocs(this.qByUid("creditCards")!);
    if (ccSnap.empty) {
      for (const card of DEFAULT_CREDIT_CARDS) {
        await addDoc(this.col("creditCards"), { ...card, uid: this.uid, createdAt: Timestamp.now() });
      }
    }

    const blSnap = await getDocs(this.qByUid("budgetLimits")!);
    if (blSnap.empty) {
      for (const lim of DEFAULT_BUDGET_LIMITS) {
        await addDoc(this.col("budgetLimits"), { ...lim, uid: this.uid, createdAt: Timestamp.now() });
      }
    }
  }

  // ---------------- TRANSAÇÕES ----------------

  getTransactionsByMonth(month: number, year: number) {
    return this.transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year && !(t as any).relatedCardId;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  calculateBalances(month: number, year: number) {
    const monthTransactions = this.getTransactionsByMonth(month, year);
    const income = monthTransactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.value, 0);
    const expense = monthTransactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.value, 0);
    const totalIncome = this.transactions.filter((t: any) => !t.relatedCardId && t.type === "INCOME").reduce((sum, t) => sum + t.value, 0);
    const totalExpense = this.transactions.filter((t: any) => !t.relatedCardId && t.type === "EXPENSE").reduce((sum, t) => sum + t.value, 0);
    return { income, expense, balance: totalIncome - totalExpense };
  }

  private calculateBillingMonth(dateStr: string, cardId: string): string {
    const card = this.creditCards.find((c) => c.id === cardId);
    if (!card) return "";
    const d = new Date(dateStr);
    const billingDate = new Date(d.getFullYear(), d.getMonth(), 1);
    if (d.getDate() >= card.bestPurchaseDay) billingDate.setMonth(billingDate.getMonth() + 1);
    return `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, "0")}`;
  }

  async addTransaction(t: Omit<Transaction, "id">, installments: number = 1) {
    if (!this.uid) return null;
    if ((t as any).relatedCardId) {
      const baseDate = new Date(t.date);
      for (let i = 0; i < installments; i++) {
        const d = new Date(baseDate);
        d.setMonth(baseDate.getMonth() + i);
        const billingMonth = this.calculateBillingMonth(d.toISOString(), (t as any).relatedCardId);
        await addDoc(this.col("transactions"), { ...t, uid: this.uid, value: t.value / installments, description: installments > 1 ? `${t.description} (${i + 1}/${installments})` : t.description, date: d.toISOString(), billingMonth, createdAt: Timestamp.now() });
      }
      return null;
    }
    const ref = await addDoc(this.col("transactions"), { ...t, uid: this.uid, createdAt: Timestamp.now() });
    return { ...t, id: ref.id } as Transaction;
  }

  async deleteTransaction(id: string) { await deleteDoc(doc(db, "transactions", id)); }

  // ---------------- AGENDA ----------------

  async addEvent(e: Omit<CalendarEvent, "id" | "source"> & { recurringDays?: number[] }) {
    if (!this.uid) return null;
    const payload = { ...e, uid: this.uid, source: "INTERNAL", completed: false, recurringDays: e.recurringDays || null, createdAt: new Date().toISOString() };
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, "users", this.uid, "events"), payload);
      return { id: docRef.id, ...payload } as CalendarEvent;
    } catch (error) { return null; }
  }

  async deleteEvent(eventId: string) {
    if (!this.uid) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, "users", this.uid, "events", eventId));
    } catch (error) { console.error(error); }
  }

  async toggleEventCompletion(eventId: string) {
    if (!this.uid) return;
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, "users", this.uid, "events", eventId), { completed: !event.completed });
      } catch (error) { console.error(error); }
    }
  }

  getConsolidatedEvents(): CalendarEvent[] {
    return [...this.events].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  private notifyListeners() { window.dispatchEvent(new Event("lyvo:data-changed")); }
}

export const store = new FirestoreStore();
