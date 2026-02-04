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

  // força o React a atualizar quando o Firestore atualizar
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
    bind<CalendarEvent>("events", (items) => (this.events = items));
    bind<CalendarConnection>("calendarConnections", (items) => (this.calendarConnections = items));
  }

  private async seedDefaultsOnce() {
    if (!this.uid || this.seeded) return;
    this.seeded = true;

    // seed credit cards if empty
    const ccSnap = await getDocs(this.qByUid("creditCards")!);
    if (ccSnap.empty) {
      for (const card of DEFAULT_CREDIT_CARDS) {
        await addDoc(this.col("creditCards"), { ...card, uid: this.uid, createdAt: Timestamp.now() });
      }
    }

    // seed budget limits if empty
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
    const income = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.value, 0);
    const expense = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.value, 0);

    const allTransactions = this.transactions.filter((t: any) => !t.relatedCardId);
    const totalIncome = allTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.value, 0);
    const totalExpense = allTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.value, 0);

    return { income, expense, balance: totalIncome - totalExpense };
  }

  private calculateBillingMonth(dateStr: string, cardId: string): string {
    const card = this.creditCards.find((c) => c.id === cardId);
    if (!card) return "";
    const d = new Date(dateStr);
    const day = d.getDate();
    const billingDate = new Date(d.getFullYear(), d.getMonth(), 1);

    if (day >= card.bestPurchaseDay) billingDate.setMonth(billingDate.getMonth() + 1);

    return `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, "0")}`;
  }

  async addTransaction(t: Omit<Transaction, "id">, installments: number = 1) {
    if (!this.uid) return null;

    // cartão (parcelado)
    if ((t as any).relatedCardId) {
      const baseDate = new Date(t.date);
      const valPerInstallment = t.value / installments;

      for (let i = 0; i < installments; i++) {
        const d = new Date(baseDate);
        d.setMonth(baseDate.getMonth() + i);
        const billingMonth = this.calculateBillingMonth(d.toISOString(), (t as any).relatedCardId);

        await addDoc(this.col("transactions"), {
          ...t,
          uid: this.uid,
          value: valPerInstallment,
          description: installments > 1 ? `${t.description} (${i + 1}/${installments})` : t.description,
          date: d.toISOString(),
          billingMonth,
          createdAt: Timestamp.now(),
        });
      }
      return null;
    }

    const ref = await addDoc(this.col("transactions"), {
      ...t,
      uid: this.uid,
      createdAt: Timestamp.now(),
    });

    // atualizar spent (opcional, igual ao mock)
    if (t.type === "EXPENSE") {
      const budget = this.budgetLimits.find((b) => b.category === t.category);
      if (budget) {
        await updateDoc(doc(db, "budgetLimits", budget.id), {
          spent: (budget.spent || 0) + t.value,
        });
      }
    }

    return { ...(t as any), id: ref.id } as Transaction;
  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(db, "transactions", id));
  }

  async updateTransaction(id: string, data: Partial<Transaction>) {
    // recalcula billingMonth se mexer em date e for transação de cartão
    const current = this.transactions.find((t) => t.id === id);
    const patch: any = { ...data };

    if (current && (current as any).relatedCardId && data.date) {
      patch.billingMonth = this.calculateBillingMonth(data.date, (current as any).relatedCardId);
    }

    await updateDoc(doc(db, "transactions", id), patch);
    return { ...(current as any), ...patch } as Transaction;
  }

  // ---------------- FIXED BILLS ----------------

  getFixedBillsByMonth(month: number, year: number) {
    const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return this.fixedBills.filter((bill) => {
      if (currentMonthStr < bill.startMonth) return false;
      if ((bill as any).endedAt && currentMonthStr >= (bill as any).endedAt) return false;
      if (bill.skippedMonths.includes(currentMonthStr)) return false;
      return true;
    });
  }

  async addFixedBill(
    bill: Omit<FixedBill, "id" | "paidMonths" | "skippedMonths" | "startMonth">,
    month: number,
    year: number
  ) {
    if (!this.uid) return null;
    const startMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    const newBill: Omit<FixedBill, "id"> = {
      ...(bill as any),
      startMonth: startMonthStr,
      paidMonths: [],
      skippedMonths: [],
    };

    const ref = await addDoc(this.col("fixedBills"), {
      ...newBill,
      uid: this.uid,
      createdAt: Timestamp.now(),
    });
// update otimista (evita “só aparece na segunda”)


    return { ...(newBill as any), id: ref.id } as FixedBill;
  }

  async toggleFixedBillStatus(id: string, month: number, year: number) {
    const bill = this.fixedBills.find((b) => b.id === id);
    if (!bill) return;

    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const isPaid = bill.paidMonths.includes(key);

    if (!isPaid) {
      await updateDoc(doc(db, "fixedBills", id), { paidMonths: [...bill.paidMonths, key] });

      await this.addTransaction({
        type: "EXPENSE",
        value: bill.baseValue,
        description: `Pagamento: ${bill.name}`,
        category: bill.category,
        date: new Date(year, month, bill.dueDay).toISOString(),
      } as any);
    } else {
      await updateDoc(doc(db, "fixedBills", id), { paidMonths: bill.paidMonths.filter((m) => m !== key) });

      const desc = `Pagamento: ${bill.name}`;
      const trans = this.transactions.find(
        (t) => t.description === desc && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year
      );
      if (trans) await this.deleteTransaction(trans.id);
    }
  }

  async deleteFixedBill(
  id: string,
  mode: "ONLY_THIS" | "ALL_FUTURE",
  month: number,
  year: number
) {
  const bill = this.fixedBills.find((b) => b.id === id);
  if (!bill) return;

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  if (mode === "ALL_FUTURE") {
    // encerra a recorrência no mês ANTERIOR ao atual
    const [yy, mm] = currentMonthStr.split("-").map(Number);
    const prev = new Date(yy, mm - 2, 1);
    const endMonth = `${prev.getFullYear()}-${String(
      prev.getMonth() + 1
    ).padStart(2, "0")}`;

    await updateDoc(doc(db, "fixedBills", id), {
      endedAt: endMonth,
    });
  } else {
    const skipped = bill.skippedMonths.includes(currentMonthStr)
      ? bill.skippedMonths
      : [...bill.skippedMonths, currentMonthStr];

    await updateDoc(doc(db, "fixedBills", id), {
      skippedMonths: skipped,
    });
  }
}


  // ---------------- FORECASTS ----------------

  getForecastsByMonth(month: number, year: number) {
    const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return this.forecasts.filter((f) => {
      if (currentMonthStr < f.startMonth) return false;
      if (!f.isRecurring && currentMonthStr !== f.startMonth) return false;
      if (f.skippedMonths.includes(currentMonthStr)) return false;
      if ((f as any).endedAt && currentMonthStr >= (f as any).endedAt) return false;
      return true;
    });
  }

  async addForecast(
    f: Omit<Forecast, "id" | "status" | "startMonth" | "skippedMonths">,
    month: number,
    year: number
  ) {
    if (!this.uid) return null;
    const startMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    const newF: Omit<Forecast, "id"> = {
      ...(f as any),
      status: "PENDING",
      startMonth: startMonthStr,
      skippedMonths: [],
    };

    const ref = await addDoc(this.col("forecasts"), {
      ...newF,
      uid: this.uid,
      createdAt: Timestamp.now(),
    });

    return { ...(newF as any), id: ref.id } as Forecast;
  }

  async updateForecast(id: string, data: Partial<Omit<Forecast, "id">>) {
    await updateDoc(doc(db, "forecasts", id), data as any);
  }

  async deleteForecast(id: string, mode: "ONLY_THIS" | "ALL_FUTURE", month: number, year: number) {
    const f = this.forecasts.find((x) => x.id === id);
    if (!f) return;

    const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    if (mode === "ALL_FUTURE") {
      await updateDoc(doc(db, "forecasts", id), { endedAt: currentMonthStr } as any);
    } else {
      const skipped = f.skippedMonths.includes(currentMonthStr) ? f.skippedMonths : [...f.skippedMonths, currentMonthStr];
      await updateDoc(doc(db, "forecasts", id), { skippedMonths: skipped } as any);
    }
  }

  async confirmForecast(id: string, month: number, year: number) {
    const f = this.forecasts.find((x) => x.id === id);
    if (!f) return;

    const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    if (!f.skippedMonths.includes(currentMonthStr)) {
      await updateDoc(doc(db, "forecasts", id), { skippedMonths: [...f.skippedMonths, currentMonthStr] } as any);
    }

    await this.addTransaction({
      type: f.type === "EXPECTED_INCOME" ? "INCOME" : "EXPENSE",
      value: f.value,
      description: f.description,
      category: (f as any).category || "Outros",
      date: new Date(year, month, new Date().getDate()).toISOString(),
    } as any);
  }

  // ---------------- BUDGET LIMITS ----------------
// ---------------- BUDGET LIMITS ----------------

  /**
   * Calcula o gasto total de uma categoria somando:
   * 1. Transações de despesa (EXPENSE) que não são de cartão.
   * 2. Transações vinculadas a cartões de crédito.
   * Nota: Contas fixas pagas geram uma transação de despesa automaticamente, 
   * então já estão incluídas no item 1.
   */
  calculateTotalSpentByCategory(category: string, month: number, year: number) {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    return this.transactions
      .filter((t) => {
        const d = new Date(t.date);
        
        // Critério 1: Mesma categoria
        const isSameCategory = t.category === category;

        // Critério 2: É uma despesa
        const isExpense = t.type === "EXPENSE";

        // Critério 3: Pertence ao mês selecionado
        // Para transações de cartão, usamos o billingMonth (fatura)
        // Para transações normais, usamos a data real
        const isInMonth = (t as any).relatedCardId 
          ? (t as any).billingMonth === monthStr
          : d.getMonth() === month && d.getFullYear() === year;

        return isSameCategory && isExpense && isInMonth;
      })
      .reduce((acc, t) => acc + t.value, 0);
  }
  async addBudgetLimit(category: string, monthlyLimit: number) {
    if (!this.uid) return null;
    const newLimit: Omit<BudgetLimit, "id"> = { category, monthlyLimit, spent: 0 };
    const ref = await addDoc(this.col("budgetLimits"), { ...newLimit, uid: this.uid, createdAt: Timestamp.now() });
    return { ...(newLimit as any), id: ref.id } as BudgetLimit;
  }

  async updateBudgetLimit(id: string, category: string, monthlyLimit: number) {
    await updateDoc(doc(db, "budgetLimits", id), { category, monthlyLimit } as any);
  }
  // Método para excluir categoria (necessário para o novo botão da lixeira)
  async deleteBudgetLimit(id: string) {
    if (!this.uid) return;
    await deleteDoc(doc(db, "budgetLimits", id));
  }

  // Método para edição cirúrgica de Contas Fixas
  async updateFixedBill(id: string, data: any, mode: 'ONLY_THIS' | 'ALL_FUTURE', month: number, year: number) {
    if (!this.uid) return;
    const bill = this.fixedBills.find(b => b.id === id);
    if (!bill) return;

    if (mode === 'ONLY_THIS') {
      // 1. "Deleta" apenas neste mês (adiciona aos meses pulados)
      await this.deleteFixedBill(id, 'ONLY_THIS', month, year);
      
      // 2. Cria uma transação avulsa editada para este mês específico
      await this.addTransaction({
        type: "EXPENSE",
        value: data.baseValue,
        description: data.name,
        category: data.category,
        date: new Date(year, month, data.dueDay).toISOString(),
      } as any);
    } else {
      // Atualiza o documento original para todos os meses futuros
      await updateDoc(doc(db, "fixedBills", id), data);
    }
  }

  // ---------------- CREDIT CARDS ----------------

  async addCreditCard(card: Omit<CreditCard, "id" | "paidInvoices">) {
    if (!this.uid) return null;
    const newCard: Omit<CreditCard, "id"> = { ...(card as any), paidInvoices: [] };
    const ref = await addDoc(this.col("creditCards"), { ...newCard, uid: this.uid, createdAt: Timestamp.now() });
    return { ...(newCard as any), id: ref.id } as CreditCard;
  }

  async updateCreditCard(id: string, data: Partial<Omit<CreditCard, "id">>) {
    await updateDoc(doc(db, "creditCards", id), data as any);
  }

  async deleteCreditCard(id: string) {
    await deleteDoc(doc(db, "creditCards", id));
    // remove transactions linked to this card (best-effort)
    const linked = this.transactions.filter((t: any) => t.relatedCardId === id);
    for (const t of linked) {
      await this.deleteTransaction(t.id);
    }
  }

  calculateCardInvoice(cardId: string, month: number, year: number) {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return this.transactions
      .filter((t: any) => t.relatedCardId === cardId && t.billingMonth === monthStr)
      .reduce((acc, t) => acc + t.value, 0);
  }

  calculateTotalPaidOnInvoice(cardId: string, month: number, year: number) {
    const key = `PGTO_${cardId}_${year}-${String(month + 1).padStart(2, "0")}`;
    return this.transactions.filter((t) => t.description.includes(key)).reduce((acc, t) => acc + t.value, 0);
  }

  getCardTransactions(cardId: string, month: number, year: number) {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return this.transactions.filter((t: any) => t.relatedCardId === cardId && t.billingMonth === monthStr);
  }

  async payCardInvoice(cardId: string, amountPaid: number, month: number, year: number) {
    const card = this.creditCards.find((c) => c.id === cardId);
    if (!card) return;

    const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const totalInvoice = this.calculateCardInvoice(cardId, month, year);
    const previouslyPaid = this.calculateTotalPaidOnInvoice(cardId, month, year);
    const totalPaidSoFar = previouslyPaid + amountPaid;

    await this.addTransaction({
      type: "EXPENSE",
      value: amountPaid,
      description: `Pagamento Fatura: ${card.name} (Ref: PGTO_${cardId}_${currentMonthStr})`,
      category: "Cartão de Crédito",
      date: new Date().toISOString(),
    } as any);

    const nextMonthDate = new Date(year, month + 1, 1);
    const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const residualDesc = `Resíduo Fatura Anterior: ${card.name}`;

    // remove residual duplicates
    const residuals = this.transactions.filter(
      (t: any) => t.description === residualDesc && t.billingMonth === nextMonthStr
    );
    for (const r of residuals) {
      await this.deleteTransaction(r.id);
    }

    if (totalPaidSoFar < totalInvoice) {
      const residual = Math.max(0, totalInvoice - totalPaidSoFar);
      await this.addTransaction(
        {
          type: "EXPENSE",
          value: residual,
          description: residualDesc,
          date: nextMonthDate.toISOString(),
          category: "Cartão de Crédito",
          relatedCardId: card.id,
          billingMonth: nextMonthStr,
        } as any,
        1
      );
    } else {
      const paidInvoices = card.paidInvoices.includes(currentMonthStr) ? card.paidInvoices : [...card.paidInvoices, currentMonthStr];
      await updateDoc(doc(db, "creditCards", card.id), { paidInvoices } as any);
    }
  }

  isInvoicePaid(cardId: string, month: number, year: number) {
    const card = this.creditCards.find((c) => c.id === cardId);
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    return card ? card.paidInvoices.includes(key) : false;
  }

  addCreditCardTransaction(details: any) {
    const card =
      this.creditCards.find((c) => c.name.toLowerCase().includes(details.cardName.toLowerCase())) || this.creditCards[0];
    if (!card) return null;

    this.addTransaction(
      {
        type: "EXPENSE",
        value: details.value,
        description: details.description,
        date: details.purchaseDate?.toISOString?.() || new Date().toISOString(),
        category: details.category,
        relatedCardId: card.id,
      } as any,
      details.installments || 1
    );
    return card.name;
  }

  // ---------------- AGENDA ----------------

  // CORREÇÃO PARA SALVAR
  async addEvent(e: Omit<CalendarEvent, "id" | "source"> & { recurringDays?: number[] }) {
    if (!this.currentUser) return null;
    
    const payload = {
      ...e,
      uid: this.currentUser.uid,
      source: "INTERNAL",
      completed: false,
      recurringDays: e.recurringDays || null,
      createdAt: new Date().toISOString()
    };

    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const docRef = await addDoc(collection(db, "users", this.currentUser.uid, "events"), payload);
      
      const newEvent = { id: docRef.id, ...payload } as CalendarEvent;
      this.events.push(newEvent);
      this.notifyListeners();
      return newEvent;
    } catch (error) {
      console.error("Erro ao salvar evento:", error);
      return null;
    }
  }
  // CORREÇÃO PARA EXCLUIR
  async deleteEvent(eventId: string) {
    if (!this.currentUser) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      // Referência exata do documento para deletar
      const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
      await deleteDoc(eventRef);

      // Remove da lista local para atualizar a tela
      this.events = this.events.filter(e => e.id !== eventId);
      this.notifyListeners();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  }
// --- INÍCIO DA FUNÇÃO DE CONCLUIR EVENTO ---
  // --- FUNÇÃO PARA CONCLUIR EVENTO ---
  async toggleEventCompletion(eventId: string) {
    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex > -1) {
      const newStatus = !this.events[eventIndex].completed;
      this.events[eventIndex].completed = newStatus;
      this.notifyListeners();

      try {
        if (this.currentUser) {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
          await updateDoc(eventRef, { completed: newStatus });
        }
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
      }
    }
  }

  // --- FUNÇÃO ÚNICA PARA EXCLUIR EVENTO ---
  async deleteEvent(eventId: string) {
    if (!this.currentUser) return;
    
    // Remove localmente para resposta imediata
    this.events = this.events.filter(e => e.id !== eventId);
    this.notifyListeners();

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
      await deleteDoc(eventRef);
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
    }
  }// --- FUNÇÃO PARA CONCLUIR EVENTO ---
  async toggleEventCompletion(eventId: string) {
    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex > -1) {
      const newStatus = !this.events[eventIndex].completed;
      this.events[eventIndex].completed = newStatus;
      this.notifyListeners();

      try {
        if (this.currentUser) {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
          await updateDoc(eventRef, { completed: newStatus });
        }
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
      }
    }
  }

  // --- FUNÇÃO ÚNICA PARA EXCLUIR EVENTO ---
  async deleteEvent(eventId: string) {
    if (!this.currentUser) return;
    
    // Remove localmente para resposta imediata
    this.events = this.events.filter(e => e.id !== eventId);
    this.notifyListeners();

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
      await deleteDoc(eventRef);
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
    }
  }
  // --- FUNÇÃO PARA EDITAR EVENTO ---
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
    if (!this.currentUser) return;

    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex > -1) {
      this.events[eventIndex] = { ...this.events[eventIndex], ...updates };
      this.notifyListeners();

      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const eventRef = doc(db, "users", this.currentUser.uid, "events", eventId);
        await updateDoc(eventRef, updates);
      } catch (error) {
        console.error("Erro ao atualizar evento:", error);
      }
    }
  }
  // --- FIM DA FUNÇÃO ---
  
  toggleConnection(id: string) {
    const conn = this.calendarConnections.find((c) => c.id === id);
    if (!conn) return;
    const next = conn.connectionStatus === "CONNECTED" ? "DISCONNECTED" : "CONNECTED";
    return updateDoc(doc(db, "calendarConnections", conn.id), { connectionStatus: next } as any);
  }

  getConsolidatedEvents(): CalendarEvent[] {
    return [...this.events].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }
}

export const store = new FirestoreStore();
