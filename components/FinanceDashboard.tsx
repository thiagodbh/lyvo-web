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
    BarChart2
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
import { store } from "../services/mockStore";
import { Transaction, FixedBill, BudgetLimit, Forecast, CreditCard } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F43F5E', '#0EA5E9', '#64748B'];

const FinanceDashboard: React.FC = () => {
    const today = new Date();
    // Use a single Date state to ensure atomic updates of Month/Year and prevent chronological disorder
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
    const [itemToDelete, setItemToDelete] = useState<{type: 'CARD' | 'TRANSACTION' | 'FORECAST', id: string} | null>(null);
    const [billToDelete, setBillToDelete] = useState<FixedBill | null>(null);

    const [expandBills, setExpandBills] = useState(false);
    const [expandTransactions, setExpandTransactions] = useState(false);
    const [expandForecasts, setExpandForecasts] = useState(false);

    const selectedMonth = viewDate.getMonth();
    const selectedYear = viewDate.getFullYear();

    const refreshData = () => {
        try {
            setTransactions(store.getTransactionsByMonth(selectedMonth, selectedYear));
            setFixedBills(store.getFixedBillsByMonth(selectedMonth, selectedYear)); 
            setForecasts(store.getForecastsByMonth(selectedMonth, selectedYear));
            setCreditCards([...store.creditCards]);
            setLimits([...store.budgetLimits]);
            const currentBal = store.calculateBalances(selectedMonth, selectedYear);
            setBalanceData(currentBal);
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    useEffect(() => {
        refreshData();
    }, [viewDate, refreshTrigger]);

    const triggerUpdate = () => setRefreshTrigger(prev => prev + 1);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

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

    const handleDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'CARD') {
            store.deleteCreditCard(itemToDelete.id);
            setSelectedCardForDetails(null);
        } else if (itemToDelete.type === 'TRANSACTION') {
            store.deleteTransaction(itemToDelete.id);
        } else if (itemToDelete.type === 'FORECAST') {
            store.deleteForecast(itemToDelete.id, 'FROM_THIS_MONTH', selectedMonth, selectedYear);
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
            const date = new Date(t.date).toLocaleDateString('pt-BR');
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
    const sortedIncomeForecasts = [...incomeForecasts].sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    const forecastsToShow = expandForecasts ? sortedIncomeForecasts : sortedIncomeForecasts.slice(0, 4);

    const pieData = limits.map((l, index) => ({
        name: l.category,
        value: l.spent,
        color: COLORS[index % COLORS.length]
    })).filter(d => d.value > 0);

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
        <div className="flex flex-col h-full bg-lyvo-bg overflow-y-auto pb-24">
            
            <div className="bg-white p-6 pb-2 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-lyvo-text">Financeiro</h1>
                        <p className="text-lyvo-subtext text-sm">Controle sua saúde financeira</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full text-sm font-bold mt-3 sm:mt-0 text-blue-700">
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
                    <div className="bg-lyvo-primary p-4 rounded-2xl shadow-md border-l-4 border-blue-300 text-white flex justify-between items-center">
                        <div>
                            <p className="text-xs text-blue-100 font-medium uppercase">Saldo Acumulado</p>
                            <p className="text-2xl font-bold mt-1">{formatCurrency(balanceData.balance)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white p-5 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <CreditCardIcon className="w-5 h-5 text-lyvo-primary" />
                                    <h2 className="text-lg font-bold text-lyvo-text">Contas Fixas</h2>
                                </div>
                                <button onClick={() => setShowAddBillModal(true)} className="text-lyvo-primary text-sm font-bold flex items-center bg-blue-50 px-3 py-1.5 rounded-xl transition-colors">
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
                                <button onClick={() => { setEditingCard(null); setShowAddCardModal(true); }} className="text-lyvo-primary text-sm font-bold flex items-center bg-blue-50 px-3 py-1.5 rounded-xl transition-colors">
                                    <Plus className="w-4 h-4 mr-1" /> Novo
                                </button>
                            </div>
                            
                            <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
                                {creditCards.map(card => {
                                    const currentInvoice = store.calculateCardInvoice(card.id, selectedMonth, selectedYear);
                                    const available = card.limit - currentInvoice;
                                    const percent = Math.min((currentInvoice / card.limit) * 100, 100);
                                    
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
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Fatura Atual</p>
                                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(currentInvoice)}</p>
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
                                {transactions.slice(0, expandTransactions ? undefined : 4).map(t => (
                                    <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0 group">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                                {t.type === 'INCOME' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{t.description}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.value)}
                                            </span>
                                            <button onClick={() => setItemToDelete({type: 'TRANSACTION', id: t.id})} className="p-1 text-gray-300 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ))}
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
                                <button onClick={() => { setEditingForecast(null); setShowAddForecastModal(true); }} className="text-lyvo-primary text-sm font-bold flex items-center bg-blue-50 px-3 py-1.5 rounded-xl transition-colors">
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
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(f.expectedDate).toLocaleDateString('pt-BR')} • {f.category || 'Salário'}{f.isRecurring && ' • Mensal'}</p>
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
                                <button onClick={() => setShowCategoryModal(true)} className="p-1 text-lyvo-primary hover:bg-blue-50 rounded-lg transition-colors"><Plus className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                {limits.map(l => {
                                     const percent = l.monthlyLimit > 0 ? Math.min((l.spent / l.monthlyLimit) * 100, 100) : 0;
                                     return (
                                        <div key={l.id}>
                                            <div className="flex justify-between items-center text-xs mb-1">
                                                <span className="font-bold text-gray-700">{l.category}</span>
                                                <span className="text-gray-400 font-bold">{Math.round(percent)}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div style={{ width: `${percent}%` }} className={`h-full ${percent > 90 ? 'bg-red-500' : 'bg-lyvo-secondary'}`}></div>
                                            </div>
                                        </div>
                                     );
                                })}
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
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 h-[400px] flex flex-col">
                            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6">Distribuição de Gastos</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 h-[400px] flex flex-col">
                            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6">Evolução de Receitas</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={evolutionData}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3A86FF" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3A86FF" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `R$ ${v}`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="income" 
                                            stroke="#3A86FF" 
                                            fillOpacity={1} 
                                            fill="url(#colorIncome)" 
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
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

            {itemToDelete && (
                 <ConfirmationModal 
                    message={itemToDelete.type === 'CARD' ? "Excluir cartão e todos os seus lançamentos?" : itemToDelete.type === 'FORECAST' ? "Remover esta previsão de receita?" : "Excluir este lançamento?"}
                    onConfirm={handleDelete}
                    onCancel={() => setItemToDelete(null)}
                />
            )}
            {billToDelete && (
  <ConfirmationModal
    message="Excluir esta conta fixa?"
    onConfirm={() => {
      // POR PADRÃO: exclui esta e as futuras
      store.deleteFixedBill(billToDelete.id, 'FROM_THIS_MONTH', selectedMonth, selectedYear);
      setBillToDelete(null);
      triggerUpdate();
    }}
    onCancel={() => setBillToDelete(null)}
  />
)}

        </div>
    );
};

const CardDetailModal: React.FC<{ card: CreditCard, month: number, year: number, onClose: () => void, onRefresh: () => void, onPay: () => void }> = ({ card, month, year, onClose, onRefresh, onPay }) => {
    // Local refresh trigger to ensure immediate UI feedback when transactions are deleted or updated
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
        // Correct Handler: Confirm before deletion to prevent accidental clicks
        if(window.confirm("Deseja excluir permanentemente este lançamento do seu extrato?")) {
            try {
                // Requirement (b): Simulation of Firestore absolute path call
                // doc(db, 'artifacts', appId, 'users', userId, 'transactions', id)
                console.debug(`Deleting Firestore document at: artifacts/[APP_ID]/users/[USER_ID]/transactions/${id}`);
                
                // Execute deletion in store (Local state container)
                store.deleteTransaction(id);
                
                // Requirement (c): Immediate UI update and recalculation
                forceLocalUpdate(); // Modal re-render triggers new calculateCardInvoice call
                onRefresh(); // Parent re-render to update general balances
            } catch (error) {
                console.error("Erro ao excluir transação:", error);
                alert("Não foi possível excluir o item. Tente novamente.");
            }
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[85vh] animate-slide-up">
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
                                <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoice)}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase text-gray-400">Total Pago</span>
                                <p className="text-xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidValue)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest ml-2">Lançamentos do Mês</h3>
                        {transactions?.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                                <div className="text-gray-900">
                                    <p className="text-sm font-bold">{t.description}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-black text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}</span>
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
                            className={`w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${card.color || 'bg-lyvo-primary'}`}
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
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
            <h3 className="text-lg font-black uppercase mb-6">Editar Valor</h3>
            <div className="space-y-4">
                <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-gray-900" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold">Voltar</button>
              <button onClick={() => onSave(transaction.id, new Date(date).toISOString(), parseFloat(value))} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold">Salvar</button>
            </div>
          </div>
        </div>
    );
};

const PayInvoiceValueModal: React.FC<{ fullValue: number, alreadyPaid: number, onConfirm: (val: number) => void, onCancel: () => void }> = ({ fullValue, alreadyPaid, onConfirm, onCancel }) => {
    const remaining = Math.max(0, fullValue - alreadyPaid);
    const [amount, setAmount] = useState(remaining.toString());

    return (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-center text-gray-900">
            <h3 className="text-lg font-black uppercase mb-4">Valor do Pagamento</h3>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-2xl font-black outline-none text-gray-900 mb-6" />
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
              <button onClick={() => onConfirm(parseFloat(amount))} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold">Confirmar</button>
            </div>
          </div>
        </div>
    );
};

const AddFixedBillModal: React.FC<{ selectedMonth: number, selectedYear: number, onClose: () => void, onSave: () => void }> = ({ selectedMonth, selectedYear, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [dueDay, setDueDay] = useState('5');
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
                <h3 className="text-lg font-black uppercase mb-6 tracking-tight">Nova Conta Fixa</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Descrição" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    <input type="number" placeholder="Valor" value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Dia do Vencimento</label>
                        <input type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Voltar</button>
                    <button onClick={() => { if(name && value) { store.addFixedBill({ name, baseValue: parseFloat(value), dueDay: parseInt(dueDay), category: 'Moradia', isRecurring: true }, selectedMonth, selectedYear); onSave(); } }} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold">Adicionar</button>
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
                expectedDate: new Date(expectedDate).toISOString(),
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
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
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${isRecurring ? 'bg-lyvo-primary' : 'bg-gray-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">Salvar</button>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
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
              <button onClick={handleSave} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold">Salvar</button>
            </div>
          </div>
        </div>
    );
};

const CategoryModal: React.FC<{ initialData?: BudgetLimit | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const [name, setName] = useState(initialData?.category || '');
    const [limit, setLimit] = useState(initialData?.monthlyLimit?.toString() || '');
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-gray-900 text-left">
                <h3 className="text-lg font-black uppercase mb-6 tracking-tight">{initialData ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                    <input type="number" placeholder="Limite Mensal" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 placeholder:text-gray-300" />
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                    <button onClick={() => { if(name && limit) { if(initialData) store.updateBudgetLimit(initialData.id, name, parseFloat(limit)); else store.addBudgetLimit(name, parseFloat(limit)); onSave(); } }} className="flex-1 py-3 bg-lyvo-primary text-white rounded-xl font-bold">Salvar</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ message: string, onConfirm: () => void, onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
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
