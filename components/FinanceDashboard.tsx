import React, { useState, useEffect } from 'react';
import { 
    ChevronDown, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    CreditCard as CreditCardIcon, 
    Plus, 
    X,
    Edit2,
    Trash2,
    TrendingUp,
    TrendingDown,
    Target,
    AlertCircle,
    Check,
    FileText,
    Download,
    CalendarDays,
    BarChart2,
    Eye,
    EyeOff
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend, 
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area
} from 'recharts';
import { store } from "../services/firestoreStore";
import { useHideValues, brl } from '../services/privacy';
import { SpendingBreakdown, IncomeExpenseChart } from './FinanceCharts';
import { Transaction, FixedBill, BudgetLimit, Forecast, CreditCard } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F43F5E', '#0EA5E9', '#64748B'];

// Formats a date string (YYYY-MM-DD or ISO) in pt-BR without timezone shift
const formatDate = (dateStr: string): string => {
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const FinanceDashboard: React.FC = () => {
    const [hideValues, toggleHide] = useHideValues();
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [limits, setLimits] = useState<BudgetLimit[]>([]);
    const [balanceData, setBalanceData] = useState({ income: 0, expense: 0, balance: 0 });

    const [showAddBillModal, setShowAddBillModal] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [showAddForecastModal, setShowAddForecastModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCardForDetails, setSelectedCardForDetails] = useState<CreditCard | null>(null);
    const [payInvoiceModal, setPayInvoiceModal] = useState<{cardId: string, fullValue: number} | null>(null);
    
    const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
    const [editingCategory, setEditingCategory] = useState<BudgetLimit | null>(null);
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
    const [editingGeneralTransaction, setEditingGeneralTransaction] = useState<Transaction | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{type: 'CARD' | 'TRANSACTION' | 'FORECAST', id: string} | null>(null);
    const [billToDelete, setBillToDelete] = useState<FixedBill | null>(null);
    const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
    const [showEditBillModal, setShowEditBillModal] = useState(false);

    
    const [expandBills, setExpandBills] = useState(false);
    const [expandTransactions, setExpandTransactions] = useState(false);
    const [expandForecasts, setExpandForecasts] = useState(false);
    const [expandCategories, setExpandCategories] = useState(false);

    const selectedMonth = viewDate.getMonth();
    const selectedYear = viewDate.getFullYear();

    const refreshData = () => {
        try {
            setTransactions(store.getTransactionsByMonth(selectedMonth, selectedYear));
            setFixedBills(store.getFixedBillsByMonth(selectedMonth, selectedYear)); 
            setForecasts(store.getForecastsByMonth(selectedMonth, selectedYear));
            setCreditCards([...store.creditCards]);
            
            const updatedLimits = store.budgetLimits.map(limit => {
                const spentInMonth = store.calculateTotalSpentByCategory(limit.category, selectedMonth, selectedYear);
                return { ...limit, spent: spentInMonth };
            });
            
            setLimits(updatedLimits);
            const currentBal = store.calculateBalances(selectedMonth, selectedYear);
            setBalanceData(currentBal);
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    const triggerUpdate = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        refreshData();
    }, [viewDate, refreshTrigger]);

    useEffect(() => {
        const handler = () => triggerUpdate();
        window.addEventListener("lyvo:data-changed", handler);
        return () => window.removeEventListener("lyvo:data-changed", handler);
    }, []);

    const formatCurrency = (val: number) => brl(val, hideValues);

    const handleToggleBill = (id: string) => {
        store.toggleFixedBillStatus(id, selectedMonth, selectedYear);
        triggerUpdate();
    };

    const handleConfirmForecast = (id: string) => {
        store.confirmForecast(id, selectedMonth, selectedYear);
        triggerUpdate();
    };

    const handlePrevMonth = () => {
        setViewDate(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() - 1);
            return next;
        });
    };

    const handleNextMonth = () => {
        setViewDate(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            return next;
        });
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'CARD') {
            await store.deleteCreditCard(itemToDelete.id);
            setSelectedCardForDetails(null);
        } else if (itemToDelete.type === 'TRANSACTION') {
            await store.deleteTransaction(itemToDelete.id);
        } else if (itemToDelete.type === 'FORECAST') {
            await store.deleteForecast(itemToDelete.id, 'FROM_THIS_MONTH', selectedMonth, selectedYear);
        }
        triggerUpdate();
        setItemToDelete(null);
    };

    const confirmPayment = (amount: number) => {
        if (payInvoiceModal) {
            store.payCardInvoice(payInvoiceModal.cardId, amount, selectedMonth, selectedYear);
            setPayInvoiceModal(null);
            setSelectedCardForDetails(null); 
            triggerUpdate();
        }
    };

    const handleExportCSV = () => {
        const allTrans = store.transactions;
        const header = "Data,Descricao,Categoria,Valor,Tipo\n";
        const rows = allTrans.map(t => {
            const date = formatDate(t.date);
            return `${date},${t.description.replace(/,/g, '')},${t.category},${t.value},${t.type}`;
        }).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `relatorio_financeiro_${selectedYear}_${selectedMonth + 1}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const unpaidFixedBills = fixedBills.filter(b => !b.paidMonths.includes(monthKey));
    const pendingCardInvoices = creditCards.map(c => {
        const val = store.calculateCardInvoice(c.id, selectedMonth, selectedYear);
        const isPaid = store.isInvoicePaid(c.id, selectedMonth, selectedYear);
        return { card: c, val, isPaid };
    }).filter(item => !item.isPaid && item.val > 0);

    const totalExpectedIncome = forecasts
        .filter(f => f.type === 'EXPECTED_INCOME' && f.status === 'PENDING')
        .reduce((acc, curr) => acc + curr.value, 0);

    const totalExpectedExpense = 
        unpaidFixedBills.reduce((acc, b) => acc + b.baseValue, 0) +
        pendingCardInvoices.reduce((acc, c) => acc + c.val, 0) +
        forecasts.filter(f => f.type === 'EXPECTED_EXPENSE' && f.status === 'PENDING').reduce((acc, curr) => acc + curr.value, 0);

    const projectedBalance = balanceData.balance + totalExpectedIncome - totalExpectedExpense;

    const sortedBills = [...fixedBills].sort((a, b) => a.dueDay - b.dueDay);
    const billsToShow = expandBills ? sortedBills : sortedBills.slice(0, 4);

    const incomeForecasts = forecasts.filter(f => f.type === 'EXPECTED_INCOME' && f.status === 'PENDING');
    const sortedIncomeForecasts = [...incomeForecasts].sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
    const forecastsToShow = expandForecasts ? sortedIncomeForecasts : sortedIncomeForecasts.slice(0, 4);
    
    const sortedTransactions = [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date)
    );
    const transactionsToShow = expandTransactions ? sortedTransactions : sortedTransactions.slice(0, 4);

    const pieData = limits.map((l) => ({ name: l.category, value: Number(l.spent) || 0 })).filter(d => d.value > 0);

    const getEvolutionData = () => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(selectedYear, selectedMonth - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const bal = store.calculateBalances(m, y);
            data.push({
                month: d.toLocaleDateString('pt-BR', { month: 'short' }),
                income: bal.income,
                expense: bal.expense
            });
        }
        return data;
    };
    const evolutionData = getEvolutionData();

    return (
        <div className="flex flex-col h-full bg-lyvo-bg overflow-y-auto overscroll-none" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
            
            <div className="bg-white p-6 pb-2 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-lyvo-text">Financeiro</h1>
                        <p className="text-lyvo-subtext text-sm">Controle sua saúde financeira</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <button onClick={toggleHide} aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'} title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-blue-700">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <span className="capitalize min-w-[120px] text-center">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                    </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-lyvo-secondary flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase">Receitas (mês)</p>
                            <p className="text-xl font-bold text-lyvo-secondary mt-1">{formatCurrency(balanceData.income)}</p>
                        </div>
                        <ArrowUpCircle className="w-8 h-8 text-lyvo-secondary opacity-20" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase">Despesas (mês)</p>
                            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(balanceData.expense)}</p>
                        </div>
                        <ArrowDownCircle className="w-8 h-8 text-red-500 opacity-20" />
                    </div>
                    <BalanceCard balance={balanceData.balance} month={selectedMonth} year={selectedYear} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white p-5 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <CreditCardIcon className="w-5 h-5 text-lyvo-primary" />
                                    <h2 className="text-lg font-bold text-lyvo-text">Contas Fixas</h2>
                                </div>
                                <button onClick={() => setShowAddBillModal(true)} className="text-lyvo-primary text-sm font-bold flex items-center bg-teal-50 px-3 py-1.5 rounded-xl transition-colors">
                                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {billsToShow.map(bill => {
                                    const isPaid = bill.paidMonths.includes(monthKey);
                                    return (
                                        <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setBillToDelete(bill)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button 
    onClick={() => { setEditingBill(bill); setShowEditBillModal(true); }} 
    className="p-1 text-gray-300 hover:text-[#3A86FF] transition-colors"
>
    <Edit2 className="w-4 h-4" />
</button>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{bill.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        Vence dia {bill.dueDay} • {formatCurrency(bill.baseValue)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className={`text-[10px] font-black uppercase ${isPaid ? 'text-green-500' : 'text-orange-500'}`}>
                                                    {isPaid ? 'Pago' : 'Aberto'}
                                                </span>
                                                <button 
                                                    onClick={() => handleToggleBill(bill.id)}
                                                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPaid ? 'bg-lyvo-primary' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${isPaid ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {sortedBills.length > 4 && (
                                    <button 
                                        onClick={() => setExpandBills(!expandBills)} 
                                        className="w-full py-2 text-lyvo-primary text-xs font-black uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        {expandBills ? 'Ver Menos' : 'Ver Mais'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-3xl shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-lyvo-text flex items-center gap-2">
                                    <CreditCardIcon className="w-5 h-5 text-lyvo-primary" />
                                    Meus Cartões
                                </h2>
                                <button onClick={() => { setEditingCard(null); setShowAddCardModal(true); }} className="text-lyvo-primary text-sm font-bold flex items-center bg-teal-50 px-3 py-1.5 rounded-xl transition-colors">
                                    <Plus className="w-4 h-4 mr-1" /> Novo
                                </button>
                            </div>
                            
                            <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
                                {creditCards.map(card => {
                                    const currentInvoice = store.calculateCardInvoice(card.id, selectedMonth, selectedYear);
                                    const invoicePaid = store.isInvoicePaid(card.id, selectedMonth, selectedYear);
                                    // limite comprometido = faturas ainda não pagas, deste mês em diante (inclui parcelas futuras)
                                    const fromKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
                                    const committed = store.transactions
                                        .filter((t: any) => t.relatedCardId === card.id && t.billingMonth >= fromKey && !(card.paidInvoices || []).includes(t.billingMonth))
                                        .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
                                    const available = card.limit - committed;
                                    const percent = card.limit ? Math.min((committed / card.limit) * 100, 100) : 0;
                                    
                                    return (
                                        <div 
                                            key={card.id} 
                                            className="min-w-[280px] w-[300px] border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden bg-white active:scale-[0.98] transition-all"
                                        >
                                            <div className={`absolute top-0 left-0 bottom-0 w-2 ${card.color}`}></div>
                                            <div className="pl-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div onClick={() => setSelectedCardForDetails(card)} className="cursor-pointer">
                                                        <h3 className="font-bold text-gray-900">{card.name}</h3>
                                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Melhor Compra: Dia {card.bestPurchaseDay}</p>
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <button onClick={() => { setEditingCard(card); setShowAddCardModal(true); }} className="p-1 text-gray-300 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => setItemToDelete({type: 'CARD', id: card.id})} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-gray-400 font-black uppercase">Fatura Atual</p>
                                                        {invoicePaid && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 ring-1 ring-emerald-200">
                                                                <Check className="w-3 h-3" /> Paga
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-xl font-bold ${invoicePaid ? 'text-gray-400 line-through decoration-1' : 'text-gray-900'}`}>{formatCurrency(currentInvoice)}</p>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
                                                        <span>Limite</span>
                                                        <span>{formatCurrency(available)} livres</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div style={{ width: `${percent}%` }} className={`h-full ${card.color}`}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                         <div className="bg-white p-5 rounded-3xl shadow-sm mb-8">
                            <h2 className="text-lg font-bold text-lyvo-text">Transações Gerais</h2>
                            <div className="space-y-4 mt-4">
                                {transactionsToShow.map(t => (
                                    <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0 group">
                                        <div className="flex min-w-0 flex-1 items-center space-x-3">
                                            <div className={`shrink-0 p-2 rounded-full ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                                {t.type === 'INCOME' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 text-sm truncate">{(t.description || t.category).replace(/\s*\(Ref: PGTO_[^)]*\)/, '')}</p>
                                                <p className="text-[10px] text-gray-400">{formatDate(t.date)} • {t.category}</p>
                                            </div>
                                            <p className={`shrink-0 text-sm font-bold tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                {t.type === 'INCOME' ? '+' : '−'} {formatCurrency(Number(t.value) || 0)}
                                            </p>
                                        </div>
                                        <div className="ml-2 flex shrink-0 items-center space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => setEditingGeneralTransaction(t)}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 active:text-blue-600"
                                            aria-label="Editar transação"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setItemToDelete({ type: 'TRANSACTION', id: t.id })}
                                            className="p-1.5 text-gray-400 hover:text-red-500 active:text-red-600"
                                            aria-label="Excluir transação"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                    </div>
                                ))}
                                
                                {transactions.length > 4 && (
                                    <button 
                                        onClick={() => setExpandTransactions(!expandTransactions)} 
                                        className="w-full py-2 text-lyvo-primary text-xs font-black uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all mt-2"
                                    >
                                        {expandTransactions ? 'Ver Menos' : 'Ver Mais'}
                                    </button>
                                )}

                                {transactions.length === 0 && <p className="text-center text-gray-400 text-xs py-4">Sem lançamentos avulsos.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-5 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-lyvo-text flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-lyvo-primary" />
                                    Previsibilidade
                                </h2>
                                <button onClick={() => { setEditingForecast(null); setShowAddForecastModal(true); }} className="text-lyvo-primary text-sm font-bold flex items-center bg-teal-50 px-3 py-1.5 rounded-xl transition-colors">
                                    <Plus className="w-4 h-4 mr-1" /> Receita
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between items-center text-xs text-gray-400 uppercase font-black tracking-widest mb-1">
                                        <span>Projeção de Saldo</span>
                                        <span className={projectedBalance >= 0 ? 'text-green-500' : 'text-red-500'}>{projectedBalance >= 0 ? 'Positivo' : 'Crítico'}</span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">{formatCurrency(projectedBalance)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 bg-green-50 rounded-xl border border-green-100/50">
                                        <span className="text-[9px] font-black uppercase text-green-600">Prev. Receita</span>
                                        <p className="text-sm font-bold text-gray-900">+{formatCurrency(totalExpectedIncome)}</p>
                                    </div>
                                    <div className="p-3 bg-red-50 rounded-xl border border-red-100/50">
                                        <span className="text-[9px] font-black uppercase text-red-600">Prev. Saída</span>
                                        <p className="text-sm font-bold text-gray-900">-{formatCurrency(totalExpectedExpense)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-50">
                                    <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Receitas Previsíveis</h3>
                                    {forecastsToShow.map(f => (
                                        <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 group relative">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-xs font-bold text-gray-900">{f.description}</p>
                                                    <p className="text-[10px] font-black text-green-600">{formatCurrency(f.value)}</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{formatDate(f.expectedDate)} • {f.category || 'Salário'}{f.isRecurring && ' • Mensal'}</p>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => { setEditingForecast(f); setShowAddForecastModal(true); }} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => setItemToDelete({type: 'FORECAST', id: f.id})} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleConfirmForecast(f.id)}
                                                className="ml-4 p-2.5 bg-green-500 text-white rounded-xl shadow-md hover:bg-green-600 transition-all active:scale-90 flex items-center justify-center"
                                                title="Concluir Recebimento"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {incomeForecasts.length > 4 && (
                                        <button 
                                            onClick={() => setExpandForecasts(!expandForecasts)} 
                                            className="w-full py-2 text-lyvo-primary text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 rounded-xl transition-all mt-2"
                                        >
                                            {expandForecasts ? 'Ver Menos' : 'Ver Mais'}
                                        </button>
                                    )}
                                    {incomeForecasts.length === 0 && <p className="text-[10px] text-gray-400 text-center py-4">Nenhuma receita prevista para este período.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-lyvo-text">Categorias</h2>
                                <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }} className="p-1 text-lyvo-primary hover:bg-teal-50 rounded-lg transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {limits.slice(0, expandCategories ? limits.length : 4).map(l => {
                                    const percent = l.monthlyLimit > 0 ? Math.min((l.spent / l.monthlyLimit) * 100, 100) : 0;
                                    
                                    const getBarColor = (p: number) => {
                                        if (p >= 85) return 'bg-red-500';
                                        if (p >= 50) return 'bg-yellow-500';
                                        return 'bg-green-500';
                                    };

                                    return (
                                        <div key={l.id} className="group p-1 hover:bg-gray-50 rounded-xl transition-all">
                                            <div className="flex justify-between items-start text-xs mb-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700">{l.category}</span>
                                                    <span className={`font-black text-[10px] ${percent >= 100 ? 'text-red-600' : 'text-gray-400'}`}>
                                                        {formatCurrency(l.spent)} / {formatCurrency(l.monthlyLimit)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setEditingCategory(l); setShowCategoryModal(true); }}
                                                        className="p-1 text-blue-500 hover:bg-blue-100 rounded-md transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if(window.confirm(`Deseja excluir a categoria ${l.category}?`)) {
                                                                await store.deleteBudgetLimit(l.id);
                                                                triggerUpdate();
                                                            }
                                                        }}
                                                        className="p-1 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner mt-1">
                                                <div 
                                                    style={{ width: `${percent}%` }} 
                                                    className={`h-full transition-all duration-500 ease-out ${getBarColor(percent)}`}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {limits.length > 4 && (
                                    <button 
                                        onClick={() => setExpandCategories(!expandCategories)} 
                                        className="w-full py-2 text-lyvo-primary text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all mt-2"
                                    >
                                        {expandCategories ? 'Ver Menos' : `Ver Mais (${limits.length - 4})`}
                                    </button>
                                )}

                                {limits.length === 0 && (
                                    <p className="text-[10px] text-gray-400 text-center py-4">Nenhuma categoria cadastrada.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 mt-6 pb-12">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-lyvo-text font-poppins flex items-center gap-2">
                            <BarChart2 className="w-6 h-6 text-lyvo-primary" />
                            Inteligência Financeira
                        </h2>
                        <button 
                            onClick={handleExportCSV}
                            className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-100 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-base font-bold text-gray-900 mb-1">Para onde foi seu dinheiro</h3>
                            <p className="text-xs text-gray-400 mb-4">{(() => { const t = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); })()}</p>
                            <SpendingBreakdown items={pieData} fmt={formatCurrency} hidden={hideValues} />
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-[380px]">
                            <h3 className="text-base font-bold text-gray-900 mb-1">Entradas x saídas</h3>
                            <p className="text-xs text-gray-400 mb-4">Últimos 6 meses</p>
                            <IncomeExpenseChart data={evolutionData} fmt={formatCurrency} hidden={hideValues} />
                        </div>
                    </div>
                </div>
            </div>

            {selectedCardForDetails && (
              <CardDetailModal 
                card={selectedCardForDetails} 
                month={selectedMonth} 
                year={selectedYear} 
                onClose={() => setSelectedCardForDetails(null)} 
                onRefresh={triggerUpdate}
                onPay={() => setPayInvoiceModal({ 
                  cardId: selectedCardForDetails.id, 
                  fullValue: store.calculateCardInvoice(selectedCardForDetails.id, selectedMonth, selectedYear) 
                })}
              />
            )}

            {payInvoiceModal && (
              <PayInvoiceValueModal 
                fullValue={payInvoiceModal.fullValue}
                alreadyPaid={store.calculateTotalPaidOnInvoice(payInvoiceModal.cardId, selectedMonth, selectedYear)}
                onConfirm={confirmPayment}
                onCancel={() => setPayInvoiceModal(null)}
              />
            )}

            {showAddBillModal && <AddFixedBillModal selectedMonth={selectedMonth} selectedYear={selectedYear} onClose={() => setShowAddBillModal(false)} onSave={() => { triggerUpdate(); setShowAddBillModal(false); }} />}
            {showAddCardModal && <AddCreditCardModal initialData={editingCard} onClose={() => { setShowAddCardModal(false); setEditingCard(null); }} onSave={() => { triggerUpdate(); setShowAddCardModal(false); setEditingCard(null); }} />}
            {showAddForecastModal && <AddForecastModal selectedMonth={selectedMonth} selectedYear={selectedYear} initialData={editingForecast} onClose={() => { setShowAddForecastModal(false); setEditingForecast(null); }} onSave={() => { triggerUpdate(); setShowAddForecastModal(false); setEditingForecast(null); }} />}
            {showCategoryModal && <CategoryModal initialData={editingCategory} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }} onSave={() => { triggerUpdate(); setShowCategoryModal(false); setEditingCategory(null); }} />}
            {/* MODAL DE EDIÇÃO */}
{showEditBillModal && editingBill && (
    <EditFixedBillModal 
        bill={editingBill} 
        selectedMonth={selectedMonth} 
        selectedYear={selectedYear} 
        onClose={() => { setShowEditBillModal(false); setEditingBill(null); }} 
        onSave={() => { triggerUpdate(); setShowEditBillModal(false); setEditingBill(null); }} 
    />
)}
            {editingGeneralTransaction && (
              <EditTransactionModal
                transaction={editingGeneralTransaction}
                onSave={(id, date, value) => {
                  store.updateTransaction(id, { date, value });
                  setEditingGeneralTransaction(null);
                  triggerUpdate();
                }}
                onCancel={() => setEditingGeneralTransaction(null)}
              />
            )}

            {itemToDelete && itemToDelete.type !== 'FORECAST' && (
              <ConfirmationModal 
                message={itemToDelete.type === 'CARD'
                  ? "Excluir cartão e todos os seus lançamentos?"
                  : itemToDelete.type === 'TRANSACTION'
                  ? "Excluir este lançamento?"
                  : "Remover item?"
                }
                onConfirm={handleDelete}
                onCancel={() => setItemToDelete(null)}
              />
            )}

            {itemToDelete && itemToDelete.type === 'FORECAST' && (
              <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
                  <h3 className="text-lg font-bold text-gray-900">Excluir receita prevista</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Você quer excluir só deste mês ou também todos os meses futuros?
                  </p>
                  <div className="mt-4 space-y-2">
                    <button
                      className="w-full rounded-xl bg-gray-900 text-white font-bold py-3 hover:bg-gray-800 transition"
                      onClick={async () => {
                        await store.deleteForecast(itemToDelete.id, 'ONLY_THIS', selectedMonth, selectedYear);
                        setItemToDelete(null);
                        triggerUpdate();
                      }}
                    >
                      Excluir somente este mês
                    </button>
                    <button
                      className="w-full rounded-xl bg-red-600 text-white font-bold py-3 hover:bg-red-700 transition"
                      onClick={async () => {
                        await store.deleteForecast(itemToDelete.id, 'ALL_FUTURE', selectedMonth, selectedYear);
                        setItemToDelete(null);
                        triggerUpdate();
                      }}
                    >
                      Excluir este mês e os futuros
                    </button>
                    <button
                      className="w-full rounded-xl bg-gray-100 text-gray-800 font-semibold py-3 hover:bg-gray-200 transition"
                      onClick={() => setItemToDelete(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {billToDelete && (
              <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
                  <h3 className="text-lg font-bold text-gray-900">Excluir conta fixa</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Você quer excluir só deste mês ou também todos os meses futuros?
                  </p>
                  <div className="mt-4 space-y-2">
                    <button
                        className="w-full rounded-xl bg-gray-900 text-white font-bold py-3 hover:bg-gray-800 transition"
                        onClick={() => {
                            store.deleteFixedBill(billToDelete.id, 'ONLY_THIS', selectedMonth, selectedYear);
                            setBillToDelete(null);
                            triggerUpdate();
                        }}
                    >
                        Excluir somente este mês
                    </button>
                    <button
                        className="w-full rounded-xl bg-red-600 text-white font-bold py-3 hover:bg-red-700 transition"
                        onClick={() => {
                            store.deleteFixedBill(billToDelete.id, 'ALL_FUTURE', selectedMonth, selectedYear);
                            setBillToDelete(null);
                            triggerUpdate();
                        }}
                    >
                        Excluir este mês e os futuros
                    </button>
                    <button
                        className="w-full rounded-xl bg-gray-100 text-gray-800 font-semibold py-3 hover:bg-gray-200 transition"
                        onClick={() => setBillToDelete(null)}
                    >
                        Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
};

const CardDetailModal: React.FC<{ card: CreditCard, month: number, year: number, onClose: () => void, onRefresh: () => void, onPay: () => void }> = ({ card, month, year, onClose, onRefresh, onPay }) => {
    const [hideValues] = useHideValues();
    const [localUpdate, setLocalUpdate] = useState(0);
    const forceLocalUpdate = () => setLocalUpdate(prev => prev + 1);

    const currentInvoice = store.calculateCardInvoice(card.id, month, year);
    const paidValue = store.calculateTotalPaidOnInvoice(card.id, month, year);
    const transactions = store.getCardTransactions(card.id, month, year);
    const isPaid = store.isInvoicePaid(card.id, month, year);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    let statusLabel = "Aberta";
    let statusColor = "text-orange-500 bg-orange-50";
    if (isPaid) {
        statusLabel = "Paga";
        statusColor = "text-green-600 bg-green-50";
    } else if (paidValue > 0) {
        statusLabel = "Parcial";
        statusColor = "text-blue-600 bg-blue-50";
    }

    const handleUpdateTransaction = (id: string, date: string, value: number) => {
        store.updateTransaction(id, { date, value });
        setEditingTransaction(null);
        forceLocalUpdate();
        onRefresh();
    };

    const handleDeleteTransaction = async (id: string) => {
        if(window.confirm("Deseja excluir este lançamento?")) {
            store.deleteTransaction(id);
            forceLocalUpdate();
            onRefresh();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col" style={{ height: 'min(85vh, 600px)' }}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="text-gray-900">
                        <h2 className="text-xl font-bold">{card.name}</h2>
                        <p className="text-[10px] font-black uppercase text-gray-400">Detalhamento da Fatura</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor}`}>
                            {statusLabel}
                        </span>
                        <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 shadow-sm"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 text-gray-900">
                        <div className="grid grid-cols-2 gap-y-4">
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400">Total Fatura</span>
                                <p className="text-xl font-black">{brl(currentInvoice, hideValues)}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase text-gray-400">Total Pago</span>
                                <p className="text-xl font-bold text-green-600">{brl(paidValue, hideValues)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest ml-2">Lançamentos do Mês</h3>
                        {transactions?.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                                <div className="text-gray-900">
                                    <p className="text-sm font-bold">{t.description}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{formatDate(t.date)}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-black text-gray-900">{brl(t.value, hideValues)}</span>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingTransaction(t)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTransaction(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100">
                    {currentInvoice > paidValue ? (
                        <button 
                            onClick={onPay}
                            className="w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 bg-green-500 hover:bg-green-600"
                        >
                            Pagar Fatura
                        </button>
                    ) : (
                        <div className="w-full py-4 bg-green-100 text-green-600 rounded-2xl font-black text-center text-sm uppercase">Fatura Quitada</div>
                    )}
                </div>
                
                {editingTransaction && (
                    <EditTransactionModal transaction={editingTransaction} onSave={handleUpdateTransaction} onCancel={() => setEditingTransaction(null)} />
                )}
            </div>
        </div>
    );
};

const EditTransactionModal: React.FC<{ transaction: Transaction, onSave: (id: string, date: string, val: number) => void, onCancel: () => void }> = ({ transaction, onSave, onCancel }) => {
    const [date, setDate] = useState(transaction.date.split('T')[0]);
    const [value, setValue] = useState(transaction.value.toString());

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
            <h3 className="text-lg font-black uppercase mb-6">Editar Valor</h3>
            <div className="space-y-4">
                <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold">Voltar</button>
              <button onClick={() => onSave(transaction.id, new Date(date + 'T12:00:00').toISOString(), parseFloat(value))} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold">Salvar</button>
            </div>
          </div>
        </div>
    );
};

const PayInvoiceValueModal: React.FC<{ fullValue: number, alreadyPaid: number, onConfirm: (val: number) => void, onCancel: () => void }> = ({ fullValue, alreadyPaid, onConfirm, onCancel }) => {
    const remaining = Math.max(0, fullValue - alreadyPaid);
    const [amount, setAmount] = useState(remaining.toString());

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-center text-gray-900">
            <h3 className="text-lg font-black uppercase mb-4">Valor do Pagamento</h3>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-2xl font-black outline-none text-gray-900 mb-6" />
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
              <button onClick={() => onConfirm(parseFloat(amount))}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
    );
};

const AddFixedBillModal: React.FC<{ selectedMonth: number, selectedYear: number, onClose: () => void, onSave: () => void }> = ({ selectedMonth, selectedYear, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [dueDay, setDueDay] = useState('5');
    const [isRecurring, setIsRecurring] = useState(true);
    const [durationMonths, setDurationMonths] = useState('1'); // Novo estado para meses
    const availableCategories = store.budgetLimits.map(l => l.category);
    const [category, setCategory] = useState(availableCategories[0] || 'Geral');

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl text-gray-900 text-left max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black uppercase mb-6 tracking-tight">Nova Conta Fixa</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Descrição" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                    <input type="number" placeholder="Valor" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400">Vencimento (Dia)</label>
                            <input type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400">Tipo</label>
                            <select value={isRecurring ? 'REC' : 'FIX'} onChange={e => setIsRecurring(e.target.value === 'REC')} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold appearance-none">
                                <option value="REC">Recorrente</option>
                                <option value="FIX">Repetir por meses</option>
                            </select>
                        </div>
                    </div>

                    {!isRecurring && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400">Quantos meses?</label>
                            <input type="number" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Categoria</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold appearance-none">
                            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Voltar</button>
                    <button 
                        onClick={() => { 
                            if(name && value) { 
                                store.addFixedBill({ 
                                    name, 
                                    baseValue: parseFloat(value), 
                                    dueDay: parseInt(dueDay), 
                                    category, 
                                    isRecurring,
                                    // Adicionaria aqui lógica de repetição se necessário no store
                                }, selectedMonth, selectedYear); 
                                onSave(); 
                            } 
                        }} 
                        className="flex-1 py-3 bg-[#3A86FF] text-white rounded-xl font-bold"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
};
const EditFixedBillModal: React.FC<{ 
    bill: FixedBill, 
    selectedMonth: number, 
    selectedYear: number, 
    onClose: () => void, 
    onSave: () => void 
}> = ({ bill, selectedMonth, selectedYear, onClose, onSave }) => {
    const [name, setName] = useState(bill.name);
    const [value, setValue] = useState(bill.baseValue.toString());
    const [dueDay, setDueDay] = useState(bill.dueDay.toString());
    const [category, setCategory] = useState(bill.category);
    const availableCategories = store.budgetLimits.map(l => l.category);

    const handleUpdate = async (mode: 'ONLY_THIS' | 'ALL_FUTURE') => {
        if (name && value) {
            await store.updateFixedBill(
                bill.id, 
                { name, baseValue: parseFloat(value), dueDay: parseInt(dueDay), category }, 
                mode, 
                selectedMonth, 
                selectedYear
            );
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl text-gray-900 text-left max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black uppercase mb-6 tracking-tight">Editar Conta Fixa</h3>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                    <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Vencimento</label>
                            <input type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold appearance-none">
                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-2">
                    <button 
                        onClick={() => handleUpdate('ONLY_THIS')}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                    >
                        Alterar somente este mês
                    </button>
                    <button 
                        onClick={() => handleUpdate('ALL_FUTURE')}
                        className="w-full py-3 bg-[#3A86FF] text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
                    >
                        Alterar este e os futuros
                    </button>
                    <button onClick={onClose} className="w-full py-3 text-gray-400 font-bold">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const AddForecastModal: React.FC<{ selectedMonth: number, selectedYear: number, initialData?: Forecast | null, onClose: () => void, onSave: () => void }> = ({ selectedMonth, selectedYear, initialData, onClose, onSave }) => {
    const [description, setDescription] = useState(initialData?.description || '');
    const [value, setValue] = useState(initialData?.value?.toString() || '');
    const [category, setCategory] = useState(initialData?.category || 'Salário');
    const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate?.split('T')[0] || new Date(selectedYear, selectedMonth, 15).toISOString().split('T')[0]);
    const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);

    const handleSave = () => {
        if (description && value) {
            const payload = { 
                description, 
                value: parseFloat(value), 
                category, 
                expectedDate: new Date(expectedDate + 'T12:00:00').toISOString(),
                isRecurring 
            };
            if (initialData) store.updateForecast(initialData.id, payload);
            else store.addForecast({ 
                ...payload,
                type: 'EXPECTED_INCOME'
            }, selectedMonth, selectedYear);
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl text-gray-900 text-left max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black uppercase tracking-tight mb-6">{initialData ? 'Editar Receita' : 'Nova Receita Previsível'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome da Receita" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    <input type="number" placeholder="Valor" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data Esperada</label>
                            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 appearance-none">
                                <option value="Salário">Salário</option>
                                <option value="Comissão">Comissão</option>
                                <option value="Freelancer">Freelancer</option>
                                <option value="Outras">Outras</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                        <div>
                            <p className="text-xs font-bold text-gray-900">Repetir mensalmente?</p>
                            <p className="text-[10px] text-gray-400 font-medium">Ativa receita recorrente no sistema</p>
                        </div>
                        <button 
                            onClick={() => setIsRecurring(!isRecurring)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${isRecurring ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddCreditCardModal: React.FC<{ initialData?: CreditCard | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [limit, setLimit] = useState(initialData?.limit?.toString() || '');
    const [dueDay, setDueDay] = useState(initialData?.dueDay?.toString() || '10');
    const [bestDay, setBestDay] = useState(initialData?.bestPurchaseDay?.toString() || '3');

    const handleSave = () => { 
      if (name && limit) { 
        if(initialData) {
            store.updateCreditCard(initialData.id, { name, limit: parseFloat(limit), dueDay: parseInt(dueDay), bestPurchaseDay: parseInt(bestDay) });
        } else {
            store.addCreditCard({ name, limit: parseFloat(limit), dueDay: parseInt(dueDay), bestPurchaseDay: parseInt(bestDay), color: 'bg-lyvo-accent', brand: 'mastercard' }); 
        }
        onSave(); 
      } 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl text-gray-900 text-left max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black uppercase mb-6 tracking-tight">{initialData ? 'Editar Cartão' : 'Novo Cartão'}</h3>
            <div className="space-y-4">
                <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900 placeholder:text-gray-300" />
                <input type="number" placeholder="Limite Total" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900 placeholder:text-gray-300" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vencimento</label>
                        <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Melhor Compra</label>
                        <input type="number" value={bestDay} onChange={(e) => setBestDay(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
                    </div>
                </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Voltar</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#3A86FF] text-white rounded-xl font-bold">Salvar</button>
            </div>
          </div>
        </div>
    );
};

const CategoryModal: React.FC<{ initialData?: BudgetLimit | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const [name, setName] = useState(initialData?.category || '');
    const [limit, setLimit] = useState(initialData?.monthlyLimit?.toString() || '');
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl text-gray-900 text-left max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black uppercase mb-6 tracking-tight">{initialData ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    <input type="number" placeholder="Limite Mensal" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                    <button onClick={() => { if(name && limit) { if(initialData) store.updateBudgetLimit(initialData.id, name, parseFloat(limit)); else store.addBudgetLimit(name, parseFloat(limit)); onSave(); } }} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold">Salvar</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ message: string, onConfirm: () => void, onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-center text-gray-900">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6" /></div>
        <h3 className="text-lg font-black uppercase mb-2">Confirmar</h3>
        <p className="text-gray-500 text-xs mb-8">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">Não</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Sim, Excluir</button>
        </div>
      </div>
    </div>
);

export default FinanceDashboard;

// ─── card de saldo com escolha de cálculo ───────────────────────────────────
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const monthKeyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const monthLabelOf = (k: string) => `${MONTH_NAMES[Number(k.slice(5, 7)) - 1]}/${k.slice(2, 4)}`;

function BalanceCard({ balance, month, year }: { balance: number; month: number; year: number }) {
    const [hideValues] = useHideValues();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const prefs = store.balancePrefs;
    const now = new Date();
    const selected = monthKeyOf(year, month);
    const current = monthKeyOf(now.getFullYear(), now.getMonth());
    const nextMonth = monthKeyOf(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), (now.getMonth() + 1) % 12);
    const restartActive = prefs.mode === 'accumulated' && prefs.startMonth && selected >= prefs.startMonth;

    const title = prefs.mode === 'monthly' ? 'Resultado do mês' : 'Saldo acumulado';
    const sub = prefs.mode === 'monthly'
        ? 'entradas − saídas deste mês'
        : selected > current
            ? 'saldo de hoje (mês ainda não começou)'
            : `${restartActive ? `desde ${monthLabelOf(prefs.startMonth!)}` : 'de todos os meses'} até ${selected === current ? 'hoje' : `o fim de ${MONTH_NAMES[month]}`}`;

    const save = async (p: { mode: 'accumulated' | 'monthly'; startMonth?: string | null }) => {
        setSaving(true);
        try { await store.setBalancePrefs({ startMonth: prefs.startMonth || null, ...p }); setOpen(false); }
        catch (e) { console.error(e); alert('Não consegui salvar agora. Tente de novo.'); }
        finally { setSaving(false); }
    };

    const Option = ({ active, title: t, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) => (
        <button disabled={saving} onClick={onClick} className={`w-full rounded-xl p-3 text-left transition ${active ? 'bg-teal-50 ring-2 ring-lyvo-primary' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <p className="text-sm font-bold text-gray-900">{t}</p>
            <p className="text-xs text-gray-500">{desc}</p>
        </button>
    );

    return (
        <div className="relative bg-gradient-to-br from-lyvo-primary to-lyvo-dark p-4 rounded-2xl shadow-md border-l-4 border-lyvo-light text-white flex justify-between items-center">
            <div className="min-w-0">
                <p className="text-xs text-white/80 font-medium uppercase">{title}</p>
                <p className="text-2xl font-bold mt-1 text-white">{brl(balance, hideValues)}</p>
                <p className="text-[10px] text-white/70 mt-0.5">{sub}</p>
            </div>
            <button onClick={() => setOpen(true)} className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-white/25" aria-label="Como calcular o saldo">
                Ajustar
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
                    <div className="w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6 text-gray-900 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold">Como calcular seu saldo</h3>
                        <p className="text-xs text-gray-500 -mt-1">Escolha o que o card verde mostra. Nenhuma opção apaga seus lançamentos, e você pode trocar quando quiser.</p>
                        <Option active={prefs.mode === 'accumulated' && !prefs.startMonth} title="Saldo acumulado (padrão)"
                            desc="O que sobra de um mês passa para o próximo, como numa conta bancária. Ex.: sobrou R$ 300 em outubro e R$ 200 em novembro → novembro mostra R$ 500."
                            onClick={() => save({ mode: 'accumulated', startMonth: null })} />
                        <Option active={prefs.mode === 'monthly'} title="Só o resultado de cada mês"
                            desc="Nada passa de um mês para o outro: cada mês mostra apenas o que entrou menos o que saiu nele. Ex.: novembro mostra R$ 200, mesmo que tenha sobrado dinheiro em outubro."
                            onClick={() => save({ mode: 'monthly' })} />
                        <Option active={prefs.mode === 'accumulated' && !!prefs.startMonth}
                            title={prefs.startMonth ? `Zerado em ${monthLabelOf(prefs.startMonth)}, acumulando desde então` : `Zerar e voltar a acumular a partir de ${monthLabelOf(nextMonth)}`}
                            desc={prefs.startMonth
                                ? `O saldo antigo foi deixado de lado em ${monthLabelOf(prefs.startMonth)} e, desde lá, os meses voltaram a se somar. Meses anteriores continuam com o histórico. Toque para zerar de novo a partir de ${monthLabelOf(nextMonth)}.`
                                : `Bom para "virar a página" de um saldo negativo ou antigo: ${monthLabelOf(nextMonth)} começa do zero e, a partir dele, os meses voltam a se somar. Os meses anteriores continuam como estão.`}
                            onClick={() => save({ mode: 'accumulated', startMonth: nextMonth })} />
                        <button onClick={() => setOpen(false)} className="w-full pt-1 text-sm text-gray-400">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

