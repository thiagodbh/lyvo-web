// services/mockStore.ts
export { store } from "./firestoreStore";

import { 
    Transaction, 
    FixedBill, 
    CreditCard, 
    Forecast, 
    BudgetLimit, 
    CalendarEvent, 
    CalendarConnection 
  } from '../types';
  
  class MockStore {
    transactions: Transaction[] = [];
    fixedBills: FixedBill[] = [];
    creditCards: CreditCard[] = [
        { id: 'cc1', name: 'Nubank', limit: 5000, dueDay: 10, bestPurchaseDay: 3, color: 'bg-purple-600', brand: 'mastercard', paidInvoices: [] },
        { id: 'cc2', name: 'Inter', limit: 3000, dueDay: 15, bestPurchaseDay: 8, color: 'bg-orange-500', brand: 'mastercard', paidInvoices: [] }
    ];
    forecasts: Forecast[] = [];
    budgetLimits: BudgetLimit[] = [
      { id: '1', category: 'Alimentação', monthlyLimit: 800.00, spent: 0 },
      { id: '2', category: 'Moradia', monthlyLimit: 2000.00, spent: 0 },
      { id: '3', category: 'Transporte', monthlyLimit: 300.00, spent: 0 },
      { id: '4', category: 'Lazer', monthlyLimit: 400.00, spent: 0 },
      { id: '5', category: 'Saúde', monthlyLimit: 500.00, spent: 0 },
      { id: '6', category: 'Outros', monthlyLimit: 200.00, spent: 0 },
    ];
    events: CalendarEvent[] = [];
    calendarConnections: CalendarConnection[] = [];
  
    getTransactionsByMonth(month: number, year: number) {
      return this.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year && !t.relatedCardId; 
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    deleteTransaction(id: string) {
        this.transactions = this.transactions.filter(t => t.id !== id);
    }

    updateTransaction(id: string, data: Partial<Transaction>) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1) return;
        
        const oldT = this.transactions[index];
        const newT = { ...oldT, ...data };

        if (data.date && newT.relatedCardId) {
            newT.billingMonth = this.calculateBillingMonth(newT.date, newT.relatedCardId);
        }

        this.transactions[index] = newT;
        return newT;
    }
  
    calculateBalances(month: number, year: number) {
      const monthTransactions = this.getTransactionsByMonth(month, year);
      const income = monthTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.value, 0);
      const expense = monthTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.value, 0);
      const allTransactions = this.transactions.filter(t => !t.relatedCardId);
      const totalIncome = allTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.value, 0);
      const totalExpense = allTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.value, 0);
      return { income, expense, balance: totalIncome - totalExpense };
    }

    private calculateBillingMonth(dateStr: string, cardId: string): string {
        const card = this.creditCards.find(c => c.id === cardId);
        if (!card) return "";
        const d = new Date(dateStr);
        const day = d.getDate();
        const billingDate = new Date(d.getFullYear(), d.getMonth(), 1);
        
        if (day >= card.bestPurchaseDay) {
            billingDate.setMonth(billingDate.getMonth() + 1);
        }
        return `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, '0')}`;
    }
  
    addTransaction(t: Omit<Transaction, 'id'>, installments: number = 1) {
      if (t.relatedCardId) {
          const baseDate = new Date(t.date);
          const valPerInstallment = t.value / installments;
          
          for (let i = 0; i < installments; i++) {
              const currentInstallmentDate = new Date(baseDate);
              currentInstallmentDate.setMonth(baseDate.getMonth() + i);
              const billingMonth = this.calculateBillingMonth(currentInstallmentDate.toISOString(), t.relatedCardId);
              
              this.transactions.unshift({
                  ...t,
                  id: Math.random().toString(36).substr(2, 9),
                  value: valPerInstallment,
                  description: installments > 1 ? `${t.description} (${i + 1}/${installments})` : t.description,
                  date: currentInstallmentDate.toISOString(),
                  billingMonth
              });
          }
          return;
      }

      const newT = { ...t, id: Math.random().toString(36).substr(2, 9) };
      this.transactions.unshift(newT);
      
      if (t.type === 'EXPENSE') {
          const budget = this.budgetLimits.find(b => b.category === t.category);
          if (budget) budget.spent += t.value;
      }
      return newT;
    }

    getFixedBillsByMonth(month: number, year: number) {
        const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        return this.fixedBills.filter(bill => {
            if (currentMonthStr < bill.startMonth) return false;
            if (bill.endedAt && currentMonthStr >= bill.endedAt) return false;
            if (bill.skippedMonths.includes(currentMonthStr)) return false;
            return true;
        });
    }

    addFixedBill(bill: Omit<FixedBill, 'id' | 'paidMonths' | 'skippedMonths' | 'startMonth'>, month: number, year: number) {
        const startMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const newBill: FixedBill = {
            ...bill,
            id: Math.random().toString(36).substr(2, 9),
            startMonth: startMonthStr,
            paidMonths: [],
            skippedMonths: []
        };
        this.fixedBills.push(newBill);
        return newBill;
    }

    toggleFixedBillStatus(id: string, month: number, year: number) {
        const bill = this.fixedBills.find(b => b.id === id);
        if (bill) {
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            const isPaid = bill.paidMonths.includes(key);

            if (!isPaid) {
                bill.paidMonths.push(key);
                this.addTransaction({
                    type: 'EXPENSE',
                    value: bill.baseValue,
                    description: `Pagamento: ${bill.name}`,
                    category: bill.category,
                    date: new Date(year, month, bill.dueDay).toISOString()
                });
            } else {
                bill.paidMonths = bill.paidMonths.filter(m => m !== key);
                const desc = `Pagamento: ${bill.name}`;
                const trans = this.transactions.find(t => 
                    t.description === desc && 
                    new Date(t.date).getMonth() === month && 
                    new Date(t.date).getFullYear() === year
                );
                if (trans) this.deleteTransaction(trans.id);
            }
        }
    }

    deleteFixedBill(id: string, mode: 'ONLY_THIS' | 'ALL_FUTURE', month: number, year: number) {
        const bill = this.fixedBills.find(b => b.id === id);
        if (!bill) return;
        const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (mode === 'ALL_FUTURE') {
            bill.endedAt = currentMonthStr;
        } else {
            if (!bill.skippedMonths.includes(currentMonthStr)) {
                bill.skippedMonths.push(currentMonthStr);
            }
        }
    }

    getForecastsByMonth(month: number, year: number) {
      const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      return this.forecasts.filter(f => {
          if (currentMonthStr < f.startMonth) return false;
          if (!f.isRecurring && currentMonthStr !== f.startMonth) return false;
          if (f.skippedMonths.includes(currentMonthStr)) return false;
          if (f.endedAt && currentMonthStr >= f.endedAt) return false;
          return true;
      });
    }

    addForecast(f: Omit<Forecast, 'id' | 'status' | 'startMonth' | 'skippedMonths'>, month: number, year: number) {
        const startMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const newF: Forecast = { 
          ...f, 
          id: Math.random().toString(36).substr(2, 9), 
          status: 'PENDING',
          startMonth: startMonthStr,
          skippedMonths: []
        };
        this.forecasts.push(newF);
        return newF;
    }

    updateForecast(id: string, data: Partial<Omit<Forecast, 'id'>>) {
        const index = this.forecasts.findIndex(f => f.id === id);
        if (index !== -1) this.forecasts[index] = { ...this.forecasts[index], ...data };
    }

    deleteForecast(id: string, mode: 'ONLY_THIS' | 'ALL_FUTURE', month: number, year: number) {
        const f = this.forecasts.find(item => item.id === id);
        if (!f) return;
        const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (mode === 'ALL_FUTURE') {
            f.endedAt = currentMonthStr;
        } else {
            if (!f.skippedMonths.includes(currentMonthStr)) {
                f.skippedMonths.push(currentMonthStr);
            }
        }
    }

    confirmForecast(id: string, month: number, year: number) {
        const f = this.forecasts.find(i => i.id === id);
        if (f) {
            const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (!f.skippedMonths.includes(currentMonthStr)) {
                f.skippedMonths.push(currentMonthStr);
            }
            this.addTransaction({ 
                type: f.type === 'EXPECTED_INCOME' ? 'INCOME' : 'EXPENSE', 
                value: f.value, 
                description: f.description, 
                category: f.category || 'Outros', 
                date: new Date(year, month, new Date().getDate()).toISOString() 
            });
        }
    }

    addBudgetLimit(category: string, monthlyLimit: number) {
      const newLimit: BudgetLimit = {
        id: Math.random().toString(36).substr(2, 9),
        category,
        monthlyLimit,
        spent: 0 
      };
      this.budgetLimits.push(newLimit);
      return newLimit;
    }

    updateBudgetLimit(id: string, category: string, monthlyLimit: number) {
      const index = this.budgetLimits.findIndex(b => b.id === id);
      if (index !== -1) {
        this.budgetLimits[index] = { ...this.budgetLimits[index], category, monthlyLimit };
      }
    }

    addCreditCard(card: Omit<CreditCard, 'id' | 'paidInvoices'>) {
        const newCard: CreditCard = { ...card, id: Math.random().toString(36).substr(2, 9), paidInvoices: [] };
        this.creditCards.push(newCard);
        return newCard;
    }

    updateCreditCard(id: string, data: Partial<Omit<CreditCard, 'id'>>) {
        const index = this.creditCards.findIndex(c => c.id === id);
        if (index !== -1) this.creditCards[index] = { ...this.creditCards[index], ...data };
    }

    deleteCreditCard(id: string) {
        this.creditCards = this.creditCards.filter(c => c.id !== id);
        this.transactions = this.transactions.filter(t => t.relatedCardId !== id);
    }

    calculateCardInvoice(cardId: string, month: number, year: number) {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      return this.transactions
        .filter(t => t.relatedCardId === cardId && t.billingMonth === monthStr)
        .reduce((acc, t) => acc + t.value, 0);
    }

    calculateTotalPaidOnInvoice(cardId: string, month: number, year: number) {
        const key = `PGTO_${cardId}_${year}-${String(month + 1).padStart(2, '0')}`;
        return this.transactions
            .filter(t => t.description.includes(key))
            .reduce((acc, t) => acc + t.value, 0);
    }

    getCardTransactions(cardId: string, month: number, year: number) {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      return this.transactions.filter(t => t.relatedCardId === cardId && t.billingMonth === monthStr);
    }

    payCardInvoice(cardId: string, amountPaid: number, month: number, year: number) {
        const card = this.creditCards.find(c => c.id === cardId);
        if (!card) return;

        const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const totalInvoice = this.calculateCardInvoice(cardId, month, year);
        const previouslyPaid = this.calculateTotalPaidOnInvoice(cardId, month, year);
        const totalPaidSoFar = previouslyPaid + amountPaid;

        // Register the payment as a global expense (hits balance because NO relatedCardId)
        this.addTransaction({ 
          type: 'EXPENSE', 
          value: amountPaid, 
          description: `Pagamento Fatura: ${card.name} (Ref: PGTO_${cardId}_${currentMonthStr})`, 
          category: 'Cartão de Crédito', 
          date: new Date().toISOString() 
        });

        const nextMonthDate = new Date(year, month + 1, 1);
        const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const residualDesc = `Resíduo Fatura Anterior: ${card.name}`;
        
        // Remove existing residual for next month to avoid duplication if user pays again in chunks
        this.transactions = this.transactions.filter(t => t.description !== residualDesc || t.billingMonth !== nextMonthStr);

        if (totalPaidSoFar < totalInvoice) {
          const residual = Math.max(0, totalInvoice - totalPaidSoFar);
          // Roll residual to next invoice (hits next month's invoice because WITH relatedCardId)
          this.addTransaction({
            type: 'EXPENSE',
            value: residual,
            description: residualDesc,
            date: nextMonthDate.toISOString(),
            category: 'Cartão de Crédito',
            relatedCardId: card.id,
            billingMonth: nextMonthStr
          });
        } else {
            // Full payment logic
            if (!card.paidInvoices.includes(currentMonthStr)) {
                card.paidInvoices.push(currentMonthStr);
            }
        }
    }

    isInvoicePaid(cardId: string, month: number, year: number) {
        const card = this.creditCards.find(c => c.id === cardId);
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        return card ? card.paidInvoices.includes(key) : false;
    }

    addEvent(e: Omit<CalendarEvent, 'id' | 'source'>) {
        const newE: CalendarEvent = { ...e, id: Math.random().toString(36).substr(2, 9), source: 'INTERNAL' };
        this.events.push(newE);
        return newE;
    }

    toggleConnection(id: string) {
        const conn = this.calendarConnections.find(c => c.id === id);
        if (conn) conn.connectionStatus = conn.connectionStatus === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    }

    getConsolidatedEvents(): CalendarEvent[] {
        return [...this.events].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }

    addCreditCardTransaction(details: any) {
        const card = this.creditCards.find(c => c.name.toLowerCase().includes(details.cardName.toLowerCase())) || this.creditCards[0];
        if (!card) return null;
        this.addTransaction({ 
          type: 'EXPENSE', 
          value: details.value, 
          description: details.description, 
          date: details.purchaseDate?.toISOString() || new Date().toISOString(), 
          category: details.category, 
          relatedCardId: card.id 
        }, details.installments || 1);
        return card.name;
    }
  }
  
