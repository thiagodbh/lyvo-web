import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    MapPin, 
    ChevronLeft, 
    ChevronRight, 
    Settings, 
    RefreshCw,
    Plus,
    X,
    Check,
    MoreHorizontal
} from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';

type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

const AgendaView: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [connections, setConnections] = useState<CalendarConnection[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0);

    // --- Integração Google Agenda (Melhorada) ---
    const loginComGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                // Buscamos o intervalo do mês atual para não vir apenas eventos futuros
                const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
                const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString();

                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${firstDay}&timeMax=${lastDay}&singleEvents=true&orderBy=startTime`,
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                
                const data = await response.json();

                if (data.items) {
                    const googleEvents = data.items.map((gEvent: any) => ({
                        id: gEvent.id,
                        title: gEvent.summary || "(Sem título)",
                        dateTime: gEvent.start.dateTime || gEvent.start.date, // Trata dia inteiro
                        location: gEvent.location || '',
                        source: 'GOOGLE' as const,
                        color: 'border-emerald-500' // Cor distinta para Google
                    }));

                    // Mescla com os existentes e atualiza o store se necessário
                    setEvents(prev => {
                        const filteredPrev = prev.filter(e => e.source !== 'GOOGLE');
                        return [...filteredPrev, ...googleEvents];
                    });
                    setShowSyncModal(false);
                }
            } catch (error) {
                console.error("Erro na integração:", error);
            } finally {
                setIsLoading(false);
            }
        },
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    });

    // --- Lógica de Datas ---
    useEffect(() => {
        const localEvents = store.getConsolidatedEvents();
        setEvents(prev => {
            const googleOnes = prev.filter(e => e.source === 'GOOGLE');
            return [...localEvents, ...googleOnes];
        });
        setConnections([...store.calendarConnections]);
    }, [forceUpdate, showSyncModal]);

    const calendarGrid = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        // Preencher dias do mês anterior
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, currentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
        }
        // Dias do mês atual
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
        }
        // Completar a grid até 42 casas (6 semanas)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
        }
        return days;
    }, [selectedDate]);

    const getEventsForDate = (date: Date) => {
        return events.filter(e => {
            const eDate = new Date(e.dateTime);
            return eDate.getDate() === date.getDate() && 
                   eDate.getMonth() === date.getMonth() && 
                   eDate.getFullYear() === date.getFullYear();
        });
    };

    // --- Renderização de Componentes ---

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900">
            {/* Header Estilo Google */}
            <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
                <div className="flex items-center space-x-8">
                    <div className="flex items-center space-x-3">
                        <div className="bg-lyvo-primary p-2 rounded-lg">
                            <CalendarIcon className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Agenda Lyvo</h1>
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setMonth(d.getMonth() - 1);
                            setSelectedDate(d);
                        }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={18}/></button>
                        <span className="px-4 font-semibold text-sm min-w-[140px] text-center capitalize">
                            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setMonth(d.getMonth() + 1);
                            setSelectedDate(d);
                        }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setShowSyncModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Sincronizar</span>
                    </button>
                    <button className="bg-lyvo-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center space-x-2">
                        <Plus size={18} />
                        <span>Novo Evento</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Calendar Grid */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                        {/* Dias da Semana */}
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className="py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>

                        {/* Grade de Dias */}
                        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                            {calendarGrid.map((item, idx) => {
                                const dayEvents = getEventsForDate(item.date);
                                const isToday = item.date.toDateString() === new Date().toDateString();
                                const isSelected = item.date.toDateString() === selectedDate.toDateString();

                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => setSelectedDate(item.date)}
                                        className={`min-h-[100px] p-2 border-r border-b border-slate-50 transition-all cursor-pointer
                                            ${!item.currentMonth ? 'bg-slate-50/30' : 'bg-white'}
                                            ${isSelected ? 'ring-2 ring-inset ring-lyvo-primary/20 bg-blue-50/20' : 'hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-lyvo-primary text-white shadow-md shadow-blue-200' : 'text-slate-500'}
                                                ${!item.currentMonth && 'opacity-30'}
                                            `}>
                                                {item.day}
                                            </span>
                                        </div>

                                        {/* Lista de Eventos no Dia */}
                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div 
                                                    key={event.id}
                                                    className={`text-[10px] px-2 py-1 rounded-md border-l-4 truncate font-medium
                                                        ${event.source === 'INTERNAL' 
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                                            : 'bg-emerald-50 border-emerald-500 text-emerald-700'}`}
                                                >
                                                    {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[9px] text-slate-400 font-bold pl-1">
                                                    + {dayEvents.length - 3} mais
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* Sidebar de Detalhes (Desktop) */}
                <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto hidden lg:block">
                    <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
                        <span>Compromissos</span>
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">
                            {getEventsForDate(selectedDate).length}
                        </span>
                    </h2>
                    
                    <div className="space-y-4">
                        {getEventsForDate(selectedDate).length > 0 ? (
                            getEventsForDate(selectedDate).map(event => (
                                <div key={event.id} className="group p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border-l-4 border-l-lyvo-primary">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-sm text-slate-800 leading-tight">{event.title}</h3>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase
                                            ${event.source === 'INTERNAL' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {event.source}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-[11px] text-slate-500 space-x-3">
                                        <div className="flex items-center space-x-1">
                                            <Clock size={12} />
                                            <span>{new Date(event.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center space-x-1 truncate">
                                                <MapPin size={12} />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-40">
                                <CalendarIcon className="mx-auto mb-4 w-12 h-12" />
                                <p className="text-sm font-medium">Nenhum evento para este dia</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Modal de Sincronização */}
            {showSyncModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold">Conectar Agendas</h2>
                                <p className="text-slate-500 text-sm">Centralize seus compromissos no Lyvo</p>
                            </div>
                            <button onClick={() => setShowSyncModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            {connections.map(conn => (
                                <div key={conn.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                            {conn.source === 'GOOGLE' ? <span className="font-black text-blue-500 text-xl">G</span> : <CalendarIcon className="text-lyvo-primary" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{conn.accountName}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Status: {conn.connectionStatus}</p>
                                        </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${conn.connectionStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                </div>
                            ))}

                            <button 
                                onClick={() => loginComGoogle()}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-sm hover:border-lyvo-primary hover:text-lyvo-primary hover:bg-blue-50/50 transition-all flex items-center justify-center space-x-3"
                            >
                                <Plus size={20} />
                                <span>Conectar Nova Conta Google</span>
                            </button>
                        </div>

                        <button 
                            onClick={() => setShowSyncModal(false)}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Fechar e Atualizar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
