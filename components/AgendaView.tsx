import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, 
    RefreshCw, Plus, X, Trash2, Bell, Moon, Sun, CheckCircle2 
} from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';

const AgendaView: React.FC = () => {
    // Estados de Interface
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Estado do Formulário
    const [formData, setFormData] = useState({
        title: '',
        type: 'EVENT' as 'EVENT' | 'REMINDER',
        dateTime: '',
        location: '',
        isFixed: false
    });

    // --- SINCRONIA COM GOOGLE AGENDA ---
    const loginComGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
                const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString();

                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${firstDay}&timeMax=${lastDay}&singleEvents=true&orderBy=startTime`,
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                
                const data = await response.json();
                if (data.items) {
                    const googleEvents: CalendarEvent[] = data.items.map((gEvent: any) => ({
                        id: gEvent.id,
                        title: gEvent.summary || "(Sem título)",
                        dateTime: gEvent.start.dateTime || gEvent.start.date,
                        location: gEvent.location || '',
                        source: 'GOOGLE',
                        type: 'EVENT',
                        isFixed: false
                    }));

                    // Atualiza o estado mesclando com os internos
                    setEvents(prev => {
                        const filteredPrev = prev.filter(e => e.source !== 'GOOGLE');
                        return [...filteredPrev, ...googleEvents];
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar agenda Google:", error);
            } finally {
                setIsLoading(false);
            }
        },
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    });

    // --- CARREGAMENTO INICIAL E CRUD ---
    useEffect(() => {
        const localEvents = store.getConsolidatedEvents();
        setEvents(prev => {
            const googleEvents = prev.filter(e => e.source === 'GOOGLE');
            return [...localEvents, ...googleEvents];
        });
    }, [selectedDate, showEventModal]);

    const handleSaveEvent = () => {
        if (!formData.title || !formData.dateTime) return;

        const eventToSave: CalendarEvent = {
            id: editingEvent?.id || Math.random().toString(36).substr(2, 9),
            ...formData,
            source: 'INTERNAL'
        };

        if (editingEvent) store.updateEvent(eventToSave);
        else store.addEvent(eventToSave);
        
        setShowEventModal(false);
        setEditingEvent(null);
        setFormData({ title: '', type: 'EVENT', dateTime: '', location: '', isFixed: false });
    };

    const handleDeleteEvent = (id: string) => {
        if (window.confirm("Deseja excluir permanentemente?")) {
            store.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
            setShowEventModal(false);
        }
    };

    // --- LÓGICA DE CALENDÁRIO ---
    const calendarGrid = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const startDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
        return days;
    }, [selectedDate]);

    const getEventsForDate = (date: Date) => {
        return events.filter(e => new Date(e.dateTime).toDateString() === date.toDateString());
    };

    return (
        <div className={`${isDarkMode ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-900'} min-h-screen flex flex-col font-sans transition-colors duration-500`}>
            
            {/* Header Profissional */}
            <header className={`flex items-center justify-between px-4 md:px-8 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                            <CalendarIcon className="text-white w-5 h-5" />
                        </div>
                        <span className="font-black text-xl tracking-tight hidden sm:block">LYVO</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-800/40 p-1 rounded-xl">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-1.5 hover:text-blue-400 transition-colors"><ChevronLeft size={20}/></button>
                        <span className="text-xs font-bold min-w-[120px] text-center uppercase tracking-widest">
                            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-1.5 hover:text-blue-400 transition-colors"><ChevronRight size={20}/></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => loginComGoogle()} className={`p-2.5 rounded-xl border ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'} transition-all`}>
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl hover:bg-blue-500/10 transition-colors">
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button 
                        onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Plus size={20} /> <span className="hidden md:block">Adicionar</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* CALENDÁRIO GRADE */}
                <main className="flex-1 p-2 md:p-6 overflow-y-auto">
                    <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white shadow-xl shadow-slate-200'}`}>
                        <div className="grid grid-cols-7 text-center py-4 bg-slate-800/20">
                            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                                <div key={d} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {calendarGrid.map((date, i) => {
                                const isToday = date?.toDateString() === new Date().toDateString();
                                const isSelected = date?.toDateString() === selectedDate.toDateString();
                                const dayEvents = date ? getEventsForDate(date) : [];

                                return (
                                    <div 
                                        key={i}
                                        onClick={() => date && setSelectedDate(date)}
                                        className={`min-h-[60px] md:min-h-[110px] p-2 border-r border-b transition-all cursor-pointer relative
                                            ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}
                                            ${!date ? 'bg-slate-900/10' : isSelected ? 'bg-blue-600/5' : 'hover:bg-blue-500/5'}
                                        `}
                                    >
                                        {date && (
                                            <>
                                                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg mb-2
                                                    ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-slate-400'}
                                                    ${isSelected && !isToday ? 'border border-blue-500' : ''}
                                                `}>
                                                    {date.getDate()}
                                                </span>
                                                <div className="hidden md:block space-y-1">
                                                    {dayEvents.slice(0, 2).map(e => (
                                                        <div key={e.id} className={`text-[9px] px-2 py-0.5 rounded-md border-l-2 truncate font-bold
                                                            ${e.type === 'REMINDER' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-blue-500/10 border-blue-500 text-blue-400'}`}>
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && <div className="text-[8px] text-slate-500 font-bold">+{dayEvents.length - 2} mais</div>}
                                                </div>
                                                <div className="md:hidden flex justify-center mt-1">
                                                    {dayEvents.length > 0 && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-glow" />}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* LISTA LATERAL (FOCO MOBILE) */}
                <aside className={`w-full md:w-[400px] border-t md:border-t-0 md:border-l p-6 overflow-y-auto ${isDarkMode ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black tracking-tight uppercase text-blue-500">Compromissos</h2>
                        <span className="text-[10px] bg-blue-600/10 text-blue-500 font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {getEventsForDate(selectedDate).length > 0 ? (
                            getEventsForDate(selectedDate).map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => { setEditingEvent(event); setFormData({ ...event }); setShowEventModal(true); }}
                                    className={`group p-5 rounded-3xl border transition-all cursor-pointer hover:translate-y-[-2px] active:scale-[0.98]
                                        ${isDarkMode ? 'bg-[#1e293b] border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-2xl shadow-slate-200'}
                                        ${event.type === 'REMINDER' ? 'border-l-[6px] border-l-amber-500' : 'border-l-[6px] border-l-blue-600'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {event.type === 'REMINDER' ? <CheckCircle2 size={14} className="text-amber-500" /> : <Clock size={14} className="text-blue-500" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                                    {new Date(event.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-base leading-tight mb-2">{event.title}</h3>
                                            {event.location && (
                                                <div className="flex items-center gap-1.5 text-[11px] opacity-40 font-medium">
                                                    <MapPin size={12} /> <span>{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {event.source === 'GOOGLE' && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase border border-emerald-500/20">Google</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-20 flex flex-col items-center">
                                <CalendarIcon size={64} strokeWidth={1} className="mb-4" />
                                <p className="font-bold text-sm uppercase tracking-widest">Agenda Livre</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* MODAL DE EVENTO / LEMBRETE */}
            {showEventModal && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/90 backdrop-blur-md">
                    <div className={`w-full max-w-xl rounded-t-[40px] md:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white text-slate-900'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight">{editingEvent ? 'Editar' : 'Novo Registro'}</h2>
                            <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-slate-700/50 rounded-full transition-colors"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-700">
                                <button onClick={() => setFormData({...formData, type: 'EVENT'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'EVENT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500'}`}>Compromisso</button>
                                <button onClick={() => setFormData({...formData, type: 'REMINDER'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'REMINDER' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-500'}`}>Lembrete</button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">O que vamos fazer?</label>
                                <input 
                                    type="text" placeholder="Nome da atividade..." 
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                    className={`w-full bg-slate-900/50 border-2 rounded-2xl p-4 text-sm font-bold focus:outline-none transition-all ${isDarkMode ? 'border-slate-700 focus:border-blue-500' : 'border-slate-100 focus:border-blue-500'}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Quando?</label>
                                    <input 
                                        type="datetime-local" 
                                        value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})}
                                        className="w-full bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Onde?</label>
                                    <input 
                                        type="text" placeholder="Local..."
                                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                {editingEvent && (
                                    <button onClick={() => handleDeleteEvent(editingEvent.id)} className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Excluir</button>
                                )}
                                <button onClick={handleSaveEvent} className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all">Salvar Atividade</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
