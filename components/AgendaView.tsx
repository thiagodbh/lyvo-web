import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect } from 'react';
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
    Check
} from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

const EventCard: React.FC<{ event: CalendarEvent; onClick?: () => void }> = ({ event, onClick }) => {
    const isInternal = event.source === 'INTERNAL';
    const borderColor = isInternal ? 'border-lyvo-primary' : (event.color || 'border-green-500');
    const bgColor = isInternal ? 'bg-blue-50' : 'bg-gray-50';
    const sourceLabel = isInternal ? 'Lyvo' : (event.source === 'GOOGLE' ? 'Google' : 'Externo');

    return (
        <div 
            onClick={onClick}
            className={`relative bg-white p-4 rounded-xl shadow-sm border-l-[6px] ${borderColor} mb-3 flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer active:scale-[0.98]`}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-800 text-sm leading-tight">{event.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${bgColor} text-gray-500`}>
                    {sourceLabel}
                </span>
            </div>
            
            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(event.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {event.location && (
                    <div className="flex items-center space-x-1 overflow-hidden">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const AgendaView: React.FC = () => {
    
    const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [connections, setConnections] = useState<CalendarConnection[]>([]);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Estados para controle do Modal de Edição e Criação
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);
    const functions = getFunctions(getApp(), "us-central1");
const googleConnectFn = httpsCallable(functions, "googleConnect");
const googleSyncFn = httpsCallable(functions, "googleSync");
    const loginComGoogle = useGoogleLogin({
  flow: "auth-code",
  scope: "https://www.googleapis.com/auth/calendar.events",
  access_type: "offline",
  prompt: "consent",

  onSuccess: async (codeResponse) => {
  try {
    await googleConnectFn({ code: codeResponse.code });

    const result: any = await googleSyncFn({ timeMin: new Date().toISOString() });
    console.log("googleSync result:", result);  
    const googleEvents = (result.data?.items || []).map((e: any) => ({
      id: e.id,
      title: e.title || "(Sem título)",
      dateTime: e.dateTime,
      location: e.location || "",
      source: "GOOGLE",
      color: "border-blue-500",
    }));

    setEvents(prev => [...prev, ...googleEvents]);
    setForceUpdate(prev => prev + 1);
    setShowSyncModal(false);
    alert(`${googleEvents.length} eventos sincronizados com sucesso!`);
  } catch (error: any) {
  console.error("Erro ao conectar/sincronizar Google:", error);
  const msg =
    error?.message ||
    error?.details ||
    error?.code ||
    JSON.stringify(error);

  alert("Falha ao conectar com o Google Agenda:\n\n" + msg);
}
},

  onError: (err) => {
    console.error("Erro no login Google:", err);
    alert("Falha ao conectar com o Google Agenda.");
  },
});

    // --- Data Loading ---
    useEffect(() => {
        setEvents(store.getConsolidatedEvents());
        setConnections([...store.calendarConnections]);
    }, [forceUpdate, showSyncModal]);

    // --- Event Actions (Lógica para Evitar Duplicação) ---
    const handleOpenCreateModal = () => {
        setEditingEvent({
            title: '',
            dateTime: selectedDate.toISOString(),
            type: 'EVENT',
            status: 'PENDING',
            location: '',
            description: ''
        });
        setShowEditModal(true);
    };

    const handleEditEvent = (event: CalendarEvent) => {
        setEditingEvent(event);
        setShowEditModal(true);
    };

    const handleSaveEvent = async () => {
        if (!editingEvent?.title || !editingEvent.dateTime) return;

        try {
            if (editingEvent.id) {
                // UPDATE: Se o evento já tem ID, atualizamos o existente
                await store.updateEvent(editingEvent as CalendarEvent);
            } else {
                // CREATE: Se não tem ID, criamos um novo documento
                await store.addEvent(editingEvent as Omit<CalendarEvent, "id" | "source">);
            }
            setShowEditModal(false);
            setEditingEvent(null);
            setForceUpdate(prev => prev + 1);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar o evento.");
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (window.confirm("Deseja excluir este compromisso?")) {
            await store.deleteEvent(id);
            setShowEditModal(false);
            setForceUpdate(prev => prev + 1);
        }
    };

    // --- Helpers ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

   const getEventsForDate = (date: Date) => {
        return events.filter(e => {
            const eventDate = new Date(e.dateTime);
            
            // 1. Verificação de data exata (Evento normal)
            const isSameDay = isSameDate(eventDate, date);
            
            // 2. Verificação de recorrência (Fase 3)
            const dayOfWeek = date.getDay();
            const isRecurring = e.recurringDays?.includes(dayOfWeek);
            
            // O evento aparece se for no dia específico OU se for recorrente naquele dia da semana
            return isSameDay || isRecurring;
        });
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (viewMode === 'MONTH') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'WEEK') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setSelectedDate(newDate);
    };

    const getStartOfWeek = (date: Date) => {
        const day = date.getDay();
        const diff = date.getDate() - day; // Adjust so Sunday is day 0
        return new Date(date.setDate(diff));
    };

    const toggleConnection = (id: string) => {
        store.toggleConnection(id);
        setConnections([...store.calendarConnections]); // Update local state for immediate UI feedback
        // Data refresh happens on modal close or effect dependency
    };

    // --- Views ---

    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(selectedDate);
        const firstDay = getFirstDayOfMonth(selectedDate);
        const blanks = Array(firstDay).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="bg-white rounded-3xl p-4 shadow-sm animate-fade-in h-fit">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                        <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {blanks.map((_, i) => <div key={`blank-${i}`} className="h-10 sm:h-12 md:h-14 lg:h-16" />)}
                    {days.map(day => {
                        const currentDayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                        const dayEvents = getEventsForDate(currentDayDate);
                        const isSelected = isSameDate(currentDayDate, selectedDate);
                        const isToday = isSameDate(currentDayDate, new Date());

                        return (
                            <button 
                                key={day} 
                                onClick={() => { setSelectedDate(currentDayDate); /* setViewMode('DAY'); - Don't switch view on desktop */ }}
                                className={`h-10 sm:h-12 md:h-14 lg:h-16 flex flex-col items-center justify-start pt-1 rounded-xl relative transition-all
                                    ${isSelected ? 'bg-lyvo-primary/10 ring-1 ring-lyvo-primary' : 'hover:bg-gray-50'}
                                    ${isToday ? 'font-bold text-lyvo-primary' : 'text-gray-700'}
                                `}
                            >
                                <span className="text-sm">{day}</span>
                                <div className="flex space-x-0.5 mt-1">
                                    {dayEvents.slice(0, 3).map((_, i) => (
                                        <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-lyvo-primary' : 'bg-gray-400'}`}></div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderListView = (period: 'day' | 'week') => {
        let eventsToShow: CalendarEvent[] = [];
        let title = "";

        if (period === 'day') {
            eventsToShow = getEventsForDate(selectedDate);
            title = "Compromissos do Dia";
        } else {
            // Week Logic - Simplified: Show next 7 days from selected date (or start of week)
            const start = new Date(selectedDate); // Assume selectedDate is start of view logic for simplicity
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            
            eventsToShow = events.filter(e => {
                const d = new Date(e.dateTime);
                return d >= start && d < end;
            });
            title = "Próximos 7 Dias";
        }

        if (eventsToShow.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Sem compromissos</p>
                </div>
            );
        }

        // Group by day for Week view
        const groupedEvents: { [key: string]: CalendarEvent[] } = {};
        eventsToShow.forEach(e => {
            const dateKey = new Date(e.dateTime).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
            if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
            groupedEvents[dateKey].push(e);
        });

        return (
            <div className="space-y-6">
                 {Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
                     <div key={dateLabel}>
                         <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide ml-1">{dateLabel}</h3>
                         <div className="space-y-1">
                            {dateEvents.map(event => (
    <EventCard 
        key={event.id} 
        event={event} 
        onClick={() => handleEditEvent(event)} 
    />
))}
                         </div>
                     </div>
                 ))}
            </div>
        );
    };

    // --- Main Render ---
    return (
        <div className="flex flex-col h-full bg-lyvo-bg relative overflow-hidden">
            
            {/* Header */}
            <div className="px-6 pt-6 pb-2 bg-white shadow-sm z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-lyvo-text">Minha Agenda</h1>
                        <button 
                            onClick={() => setShowSyncModal(true)}
                            className="flex items-center space-x-1 text-lyvo-primary font-medium text-sm bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Sincronizar</span>
                        </button>
                    </div>

                    {/* View Toggles & Navigation */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(['DAY', 'WEEK', 'MONTH'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                        viewMode === mode 
                                        ? 'bg-white text-lyvo-text shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {mode === 'DAY' ? 'Dia' : mode === 'WEEK' ? 'Semana' : 'Mês'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-2 text-gray-700">
                            <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-gray-100 rounded-full">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold min-w-[100px] text-center capitalize">
                                {viewMode === 'MONTH' 
                                    ? selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                                    : selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                                }
                            </span>
                            <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-gray-100 rounded-full">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Desktop Split View for Month Mode */}
                    <div className="hidden md:flex gap-6 h-full">
                         {/* Calendar Column */}
                         <div className="flex-1 lg:flex-[2]">
                            {viewMode === 'MONTH' && renderMonthView()}
                            {viewMode !== 'MONTH' && (
                                <div className="bg-white p-10 rounded-3xl text-center text-gray-400">
                                    Visualização de lista expandida
                                </div>
                            )}
                         </div>

                         {/* Events Column */}
                         <div className="flex-1 bg-white/50 rounded-3xl p-4 overflow-y-auto max-h-full">
                             <h3 className="text-lg font-bold text-lyvo-text mb-4 px-1 sticky top-0 bg-transparent">
                                 {viewMode === 'MONTH' 
                                     ? `Eventos de ${selectedDate.toLocaleDateString('pt-BR', { day:'numeric', month: 'long' })}` 
                                     : 'Lista de Eventos'}
                             </h3>
                             {renderListView(viewMode === 'WEEK' ? 'week' : 'day')}
                         </div>
                    </div>

                    {/* Mobile View (Stacked) */}
                    {/* Mobile View (Fixed Header + Scrollable List) - Fase 4 */}
<div className="md:hidden flex flex-col h-[calc(100vh-140px)]">
  {viewMode === "MONTH" && (
    <>
      {/* Calendário Fixo no Topo */}
      <div className="sticky top-0 z-20 bg-white pb-2 shadow-sm">
        {renderMonthView()}
      </div>

      {/* Lista rolável abaixo do calendário (com respiro pro FAB) */}
      <div className="flex-1 overflow-y-auto pb-24">
        {renderListView("day")}
      </div>
    </>
  )}

  {viewMode === "WEEK" && (
    <div className="flex-1 overflow-y-auto pb-24">
      {renderListView("week")}
    </div>
  )}

  {viewMode === "DAY" && (
    <div className="flex-1 overflow-y-auto pb-24">
      {renderListView("day")}
    </div>
  )}
</div>

                </div>
            </div>

            {/* FAB for new event */}
           <button 
    onClick={handleOpenCreateModal}
    className="absolute bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-blue-600 transition-transform active:scale-95 z-50"
>
    <Plus className="w-7 h-7" />
</button>
            {/* 1. Sync Modal */}
            {showSyncModal && (
                <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full sm:w-[90%] max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Sincronizar Agendas</h2>
                            <button onClick={() => setShowSyncModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {connections.map(conn => (
                                <div key={conn.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conn.source === 'GOOGLE' ? 'bg-white shadow-sm' : 'bg-blue-100'}`}>
                                            {conn.source === 'GOOGLE' ? <span className="font-bold text-blue-500 text-lg">G</span> : <CalendarIcon className="w-5 h-5 text-blue-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{conn.accountName}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {conn.connectionStatus === 'CONNECTED' ? `Sincronizado: ${new Date(conn.lastSyncDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Desconectado'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleConnection(conn.id)} className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${conn.connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${conn.connectionStatus === 'CONNECTED' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => loginComGoogle()} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-50 flex items-center justify-center space-x-2">
                                <Plus className="w-4 h-4" />
                                <span>Conectar Google Calendar</span>
                            </button>
                        </div>
                        <button onClick={() => { setShowSyncModal(false); setForceUpdate(prev => prev + 1); }} className="w-full bg-lyvo-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-600 transition">
                            Concluído
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Edit/Create Modal (Fase 2) */}
            {showEditModal && editingEvent && (
                <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">{editingEvent.id ? 'Editar Compromisso' : 'Novo Compromisso'}</h2>
                            <button onClick={() => { setShowEditModal(false); setEditingEvent(null); }} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input type="text" placeholder="Título" className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none" value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
                            
                            <div className="flex gap-2">
                                {(['EVENT', 'TASK', 'REMINDER'] as const).map(t => (
                                    <button key={t} onClick={() => setEditingEvent({...editingEvent, type: t})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${editingEvent.type === t ? 'bg-lyvo-primary text-white' : 'bg-white text-gray-400'}`}>
                                        {t === 'EVENT' ? 'Evento' : t === 'TASK' ? 'Tarefa' : 'Lembrete'}
                                    </button>
                                ))}
                            </div>
                            {/* Seletor de Recorrência Semanal (Fase 3) */}
                <div className="mt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Repetir Semanalmente</label>
                    <div className="flex justify-between mt-1 px-1">
                        {[
                            { label: 'D', value: 0 },
                            { label: 'S', value: 1 },
                            { label: 'T', value: 2 },
                            { label: 'Q', value: 3 },
                            { label: 'Q', value: 4 },
                            { label: 'S', value: 5 },
                            { label: 'S', value: 6 }
                        ].map((day) => {
                            const isSelected = editingEvent.recurringDays?.includes(day.value);
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => {
                                        const currentDays = editingEvent.recurringDays || [];
                                        const nextDays = isSelected
                                            ? currentDays.filter(d => d !== day.value)
                                            : [...currentDays, day.value];
                                        setEditingEvent({ ...editingEvent, recurringDays: nextDays });
                                    }}
                                    className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all border ${
                                        isSelected 
                                        ? 'bg-lyvo-primary text-white border-lyvo-primary shadow-sm' 
                                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                    }`}
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                            <input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none" value={editingEvent.dateTime ? new Date(editingEvent.dateTime).toISOString().slice(0, 16) : ''} onChange={e => setEditingEvent({...editingEvent, dateTime: new Date(e.target.value).toISOString()})} />

                            <div className="flex gap-3 pt-4">
                                {editingEvent.id && (
                                    <button onClick={() => handleDeleteEvent(editingEvent.id!)} className="px-5 py-3 rounded-xl bg-red-50 text-red-500 font-bold">Excluir</button>
                                )}
                                <button onClick={handleSaveEvent} className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaView;

            
