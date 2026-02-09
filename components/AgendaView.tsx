import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, 
    RefreshCw, Plus, X, Trash2, Bell, CheckCircle2 
} from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';

const AgendaView: React.FC = () => {
    // Estados de Interface
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0);

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
    }, [selectedDate, showEventModal, forceUpdate]);

    const handleSaveEvent = async () => {
        if (!formData.title || !formData.dateTime) return;

        const eventId = editingEvent?.id || Math.random().toString(36).substr(2, 9);

        const eventToSave: CalendarEvent = {
            ...formData,
            id: eventId,
            source: 'INTERNAL'
        };

        try {
            if (editingEvent?.id) {
                await store.updateEvent(eventToSave);
            } else {
                await store.addEvent(eventToSave);
            }
            
            setShowEventModal(false);
            setEditingEvent(null);
            setFormData({ title: '', type: 'EVENT', dateTime: '', location: '', isFixed: false });
            setForceUpdate(prev => prev + 1);
        } catch (error) {
            console.error("Erro ao salvar:", error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
    console.log("Tentando excluir evento com ID:", id); // Verificação técnica
    if (!id) return alert("Erro: ID do evento não encontrado.");

    if (window.confirm("Deseja excluir este compromisso permanentemente?")) {
        try {
            await store.deleteEvent(id); 
            
            // Atualiza a lista removendo o item deletado
            setEvents(prev => prev.filter(e => e.id !== id));
            
            setShowEventModal(false);
            setEditingEvent(null);
            
            // Força a atualização visual do calendário
            setForceUpdate(prev => prev + 1);
        } catch (error) {
            console.error("Erro ao deletar no Firestore:", error);
        }
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
        <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
            
            {/* Header */}
            <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                            <CalendarIcon className="text-white w-5 h-5" />
                        </div>
                        <span className="font-black text-xl tracking-tight hidden sm:block">LYVO</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-1.5 hover:text-blue-600 transition-colors"><ChevronLeft size={20}/></button>
                        <span className="text-xs font-bold min-w-[120px] text-center uppercase tracking-widest text-slate-600">
                            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-1.5 hover:text-blue-600 transition-colors"><ChevronRight size={20}/></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => loginComGoogle()} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600">
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => { setEditingEvent(null); setFormData({ title: '', type: 'EVENT', dateTime: '', location: '', isFixed: false }); setShowEventModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Plus size={20} /> <span className="hidden md:block text-sm">Adicionar</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* GRADE CALENDÁRIO */}
                <main className="flex-1 p-2 md:p-6 overflow-y-auto">
                    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="grid grid-cols-7 text-center py-4 bg-slate-50 border-b border-slate-100">
                            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                                <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
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
                                        className={`min-h-[60px] md:min-h-[110px] p-2 border-r border-b border-slate-50 transition-all cursor-pointer relative
                                            ${!date ? 'bg-slate-50/50' : isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}
                                        `}
                                    >
                                        {date && (
                                            <>
                                                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg mb-2
                                                    ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-slate-500'}
                                                    ${isSelected && !isToday ? 'border border-blue-500 text-blue-600' : ''}
                                                `}>
                                                    {date.getDate()}
                                                </span>
                                                <div className="hidden md:block space-y-1">
                                                    {dayEvents.slice(0, 2).map(e => (
                                                        <div key={e.id} className={`text-[9px] px-2 py-0.5 rounded-md border-l-2 truncate font-bold
                                                            ${e.type === 'REMINDER' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-blue-50 border-blue-500 text-blue-700'}`}>
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="md:hidden flex justify-center mt-1">
                                                    {dayEvents.length > 0 && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* LISTA LATERAL */}
                <aside className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-slate-200 p-6 overflow-y-auto pb-32 md:pb-6 bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black tracking-tight uppercase text-blue-600">Compromissos</h2>
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-3 py-1 rounded-full uppercase">
                            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {getEventsForDate(selectedDate).length > 0 ? (
                            getEventsForDate(selectedDate).map(event => (
                                <div 
    key={event.id}
    onClick={() => { 
        setEditingEvent(event); // Marca qual evento estamos editando
        setFormData({
            title: event.title,
            type: event.type || 'EVENT',
            dateTime: new Date(event.dateTime).toISOString().slice(0, 16), // Formata para o input
            location: event.location || '',
            isFixed: event.isFixed || false
        }); 
        setShowEventModal(true); 
    }}
                                    className={`group p-5 rounded-3xl border border-slate-100 bg-slate-50 transition-all cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 active:scale-[0.98]
                                        ${event.type === 'REMINDER' ? 'border-l-[6px] border-l-amber-500' : 'border-l-[6px] border-l-blue-600'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {event.type === 'REMINDER' ? <CheckCircle2 size={14} className="text-amber-500" /> : <Clock size={14} className="text-blue-500" />}
                                                <span className="text-[10px] font-black uppercase opacity-40">
                                                    {new Date(event.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-base leading-tight mb-2 text-slate-800">{event.title}</h3>
                                            {event.location && (
                                                <div className="flex items-center gap-1.5 text-[11px] opacity-40 font-medium">
                                                    <MapPin size={12} /> <span>{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {event.source === 'GOOGLE' && <span className="bg-emerald-50 text-emerald-600 text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase border border-emerald-200">Google</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-20 flex flex-col items-center">
                                <CalendarIcon size={64} strokeWidth={1} className="mb-4 text-slate-400" />
                                <p className="font-bold text-sm uppercase tracking-widest text-slate-500">Agenda Livre</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* MODAL DE EVENTO */}
            {showEventModal && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-t-[40px] md:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 bg-white">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">{editingEvent ? 'Editar' : 'Novo Registro'}</h2>
                            <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                <button onClick={() => setFormData({...formData, type: 'EVENT'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'EVENT' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Compromisso</button>
                                <button onClick={() => setFormData({...formData, type: 'REMINDER'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'REMINDER' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-400'}`}>Lembrete</button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Título</label>
                                <input 
                                    type="text" placeholder="O que vamos fazer?" 
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Data e Hora</label>
                                    <input type="datetime-local" value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Localização</label>
                                    <input type="text" placeholder="Onde?" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                {editingEvent && (
    <button 
        type="button"
        onClick={() => {
            if (editingEvent?.id) {
                handleDeleteEvent(editingEvent.id);
            }
        }} 
        className="flex-1 bg-red-500/10 text-red-500 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all"
    >
        Excluir
    </button>
)}

            {/* BOTÃO FLUTUANTE MOBILE */}
            <button 
                onClick={() => { setEditingEvent(null); setFormData({ title: '', type: 'EVENT', dateTime: '', location: '', isFixed: false }); setShowEventModal(true); }}
                className="md:hidden fixed bottom-8 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl z-[60] active:scale-95 transition-transform"
            >
                <Plus size={28} strokeWidth={3} />
            </button>
        </div>
    );
};

export default AgendaView;
