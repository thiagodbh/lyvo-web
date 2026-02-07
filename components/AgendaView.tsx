import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, 
    RefreshCw, Plus, X, Check, Trash2, Edit3, Bell, Moon, Sun, MoreVertical 
} from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';

const AgendaView: React.FC = () => {
    // Estados Principais
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

    // --- Lógica de Dados ---
    useEffect(() => {
        loadEvents();
    }, [selectedDate]);

    const loadEvents = () => {
        const data = store.getConsolidatedEvents();
        setEvents(data);
    };

    const handleSaveEvent = () => {
        if (!formData.title || !formData.dateTime) return;

        const newEvent: CalendarEvent = {
            id: editingEvent?.id || Math.random().toString(36).substr(2, 9),
            title: formData.title,
            dateTime: formData.dateTime,
            location: formData.location,
            source: 'INTERNAL',
            type: formData.type,
            isFixed: formData.isFixed
        };

        if (editingEvent) {
            store.updateEvent(newEvent);
        } else {
            store.addEvent(newEvent);
        }
        
        setShowEventModal(false);
        setEditingEvent(null);
        resetForm();
        loadEvents();
    };

    const handleDeleteEvent = (id: string) => {
        if (window.confirm("Excluir este compromisso?")) {
            store.deleteEvent(id);
            loadEvents();
            setShowEventModal(false);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', type: 'EVENT', dateTime: '', location: '', isFixed: false });
    };

    // --- Auxiliares de Calendário ---
    const daysInMonth = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const start = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        return { start, days };
    }, [selectedDate]);

    const getEventsForDate = (date: Date) => {
        return events.filter(e => new Date(e.dateTime).toDateString() === date.toDateString());
    };

    // --- Renderização ---
    return (
        <div className={`${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} min-h-screen flex flex-col transition-colors duration-300`}>
            
            {/* Header Responsivo */}
            <header className={`flex items-center justify-between px-4 md:px-8 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-4">
                    <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-blue-500" />
                        <span className="hidden sm:inline">Lyvo Calendar</span>
                    </h1>
                    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-1 hover:text-blue-400"><ChevronLeft size={20}/></button>
                        <span className="px-2 text-xs md:text-sm font-medium min-w-[100px] text-center capitalize">
                            {selectedDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-1 hover:text-blue-400"><ChevronRight size={20}/></button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button 
                        onClick={() => { resetForm(); setShowEventModal(true); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 md:px-4 md:py-2 rounded-xl flex items-center gap-2 font-bold transition-transform active:scale-95 shadow-lg shadow-blue-900/20"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Novo</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* LADO ESQUERDO: Grade do Calendário (Otimizada para Mobile) */}
                <main className="flex-1 p-2 md:p-6 overflow-y-auto">
                    <div className={`rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
                        <div className="grid grid-cols-7 text-center border-b border-slate-800 py-2">
                            {['D','S','T','Q','Q','S','S'].map(d => (
                                <div key={d} className="text-[10px] font-bold text-slate-500 uppercase">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {Array.from({ length: 42 }).map((_, i) => {
                                const dayNumber = i - daysInMonth.start + 1;
                                const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth.days;
                                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber);
                                const hasEvents = isCurrentMonth && getEventsForDate(date).length > 0;
                                const isToday = date.toDateString() === new Date().toDateString();
                                const isSelected = date.toDateString() === selectedDate.toDateString();

                                return (
                                    <div 
                                        key={i}
                                        onClick={() => isCurrentMonth && setSelectedDate(date)}
                                        className={`relative min-h-[50px] md:min-h-[100px] border-r border-b border-slate-800 p-1 transition-all cursor-pointer
                                            ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                                            ${isSelected ? 'bg-blue-600/10' : 'hover:bg-slate-800/30'}
                                        `}
                                    >
                                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                                            ${isToday ? 'bg-blue-600 text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}
                                            ${isSelected && !isToday ? 'border border-blue-500' : ''}
                                        `}>
                                            {dayNumber}
                                        </span>
                                        {/* Pontinhos no Mobile, Barrinhas no Desktop */}
                                        <div className="hidden md:block space-y-1">
                                            {getEventsForDate(date).slice(0, 2).map(e => (
                                                <div key={e.id} className={`text-[9px] px-1 truncate rounded border-l-2 ${e.type === 'REMINDER' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-blue-500/10 border-blue-500 text-blue-400'}`}>
                                                    {e.title}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="md:hidden flex justify-center gap-0.5 mt-1">
                                            {hasEvents && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* LADO DIREITO: Lista de Compromissos (Foco no Mobile) */}
                <aside className={`w-full md:w-96 border-t md:border-t-0 md:border-l p-4 md:p-6 overflow-y-auto ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                    <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
                        <span>{selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                            {getEventsForDate(selectedDate).length} atividades
                        </span>
                    </h2>

                    <div className="space-y-3">
                        {getEventsForDate(selectedDate).length > 0 ? (
                            getEventsForDate(selectedDate).map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => { setEditingEvent(event); setFormData({ ...event }); setShowEventModal(true); }}
                                    className={`group p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95
                                        ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-lg'}
                                        ${event.type === 'REMINDER' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {event.type === 'REMINDER' ? <Bell size={14} className="text-amber-500" /> : <Clock size={14} className="text-blue-500" />}
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                    {new Date(event.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-sm leading-tight">{event.title}</h3>
                                            {event.location && (
                                                <div className="flex items-center gap-1 text-[11px] opacity-50 mt-1">
                                                    <MapPin size={10} /> <span>{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {event.isFixed && <span className="bg-blue-500/10 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Fixo</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 opacity-30 flex flex-col items-center">
                                <CalendarIcon size={40} className="mb-2" />
                                <p className="text-sm">Nada agendado</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* MODAL DE EVENTO / LEMBRETE (EDITAR E CRIAR) */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white text-slate-900'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingEvent ? 'Editar Atividade' : 'Nova Atividade'}</h2>
                            <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-slate-800 rounded-full"><X /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Toggle Tipo */}
                            <div className="flex bg-slate-800 p-1 rounded-xl">
                                <button 
                                    onClick={() => setFormData({...formData, type: 'EVENT'})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === 'EVENT' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                >Compromisso</button>
                                <button 
                                    onClick={() => setFormData({...formData, type: 'REMINDER'})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === 'REMINDER' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                                >Lembrete</button>
                            </div>

                            <input 
                                type="text" placeholder="Título do compromisso..." 
                                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                className={`w-full bg-transparent border-b-2 py-3 text-lg font-bold focus:outline-none transition-colors ${isDarkMode ? 'border-slate-800 focus:border-blue-500' : 'border-slate-200 focus:border-blue-500'}`}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase opacity-50">Data e Hora</label>
                                    <input 
                                        type="datetime-local" 
                                        value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})}
                                        className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase opacity-50">Local (Opcional)</label>
                                    <input 
                                        type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800 rounded-xl transition-colors">
                                <input 
                                    type="checkbox" checked={formData.isFixed} 
                                    onChange={e => setFormData({...formData, isFixed: e.target.checked})}
                                    className="w-5 h-5 rounded-md border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                                />
                                <span className="text-sm font-medium">Evento Fixo (Recorrente)</span>
                            </label>

                            <div className="flex gap-3 pt-6">
                                {editingEvent && (
                                    <button 
                                        onClick={() => handleDeleteEvent(editingEvent.id)}
                                        className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 size={18} /> Excluir
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveEvent}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
                                >
                                    {editingEvent ? 'Salvar Alterações' : 'Criar Atividade'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
