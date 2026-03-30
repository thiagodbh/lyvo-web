import { useGoogleLogin } from '@react-oauth/google';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw, MapPin, Clock } from 'lucide-react';
import { store } from "../services/firestoreStore";
import { CalendarEvent, CalendarConnection } from '../types';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isSameDate = (a: Date, b: Date) =>
      a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const formatHour = (h: number) => {
      if (h === 0) return '';
      if (h < 12) return `${h} AM`;
      if (h === 12) return '12 PM';
      return `${h - 12} PM`;
};

const EVENT_COLORS = [
    { bg: 'bg-blue-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-yellow-400', text: 'text-gray-800' },
    ];

const getEventColor = (event: CalendarEvent) => {
      if (event.source === 'GOOGLE') return EVENT_COLORS[0];
      if (event.source === 'INTERNAL') return EVENT_COLORS[1];
      return EVENT_COLORS[2];
};

// ─── Mini-calendario (sidebar) ────────────────────────────────────────────────
const MiniCalendar: React.FC<{ selectedDate: Date; onSelect: (d: Date) => void }> = ({ selectedDate, onSelect }) => {
      const [viewDate, setViewDate] = useState(new Date(selectedDate));
      const today = new Date();
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      return (
              <div className="w-full select-none px-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                                {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>span>
                            <div className="flex gap-0.5">
                                      <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }}
                                                      className="p-0.5 rounded hover:bg-gray-100 text-gray-500">
                                                  <ChevronLeft className="w-4 h-4" />
                                      </button>button>
                                      <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }}
                                                      className="p-0.5 rounded hover:bg-gray-100 text-gray-500">
                                                  <ChevronRight className="w-4 h-4" />
                                      </button>button>
                            </div>div>
                    </div>div>
                    <div className="grid grid-cols-7 mb-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[11px] font-medium text-gray-400 py-0.5">{d}</div>div>
                          ))}
                    </div>div>
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {Array(firstDay).fill(null).map((_, i) => <div key={`b${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const d = new Date(year, month, day);
                            const isSelected = isSameDate(d, selectedDate);
                            const isToday = isSameDate(d, today);
                            return (
                                            <button key={day} onClick={() => onSelect(d)}
                                                              className={`h-7 w-7 mx-auto flex items-center justify-center rounded-full text-xs transition-all
                                                                              ${isSelected ? 'bg-blue-600 text-white font-bold' :
                                                                                                  isToday ? 'text-blue-600 font-bold hover:bg-blue-50' :
                                                                                                    'text-gray-700 hover:bg-gray-100'}`}>
                                                {day}
                                            </button>button>
                                          );
              })}
                    </div>div>
              </div>div>
            );
};

// ─── Componente principal ─────────────────────────────────────────────────────
type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

const AgendaView: React.FC = () => {
      const [viewMode, setViewMode] = useState<ViewMode>('WEEK');
      const [selectedDate, setSelectedDate] = useState(new Date());
      const [events, setEvents] = useState<CalendarEvent[]>([]);
      const [connections, setConnections] = useState<CalendarConnection[]>([]);
      const [showSyncModal, setShowSyncModal] = useState(false);
      const [showEditModal, setShowEditModal] = useState(false);
      const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);
      const [forceUpdate, setForceUpdate] = useState(0);
      const [isSyncing, setIsSyncing] = useState(false);
      const gridRef = useRef<HTMLDivElement>(null);
    
      const fns = getFunctions(getApp(), "us-central1");
      const googleConnectFn = httpsCallable(fns, "googleConnect");
      const googleSyncFn = httpsCallable(fns, "googleSync");
    
      // Scroll para hora atual
      useEffect(() => {
              if (gridRef.current && (viewMode === 'DAY' || viewMode === 'WEEK')) {
                        const h = new Date().getHours();
                        gridRef.current.scrollTop = Math.max(0, h * 60 - 120);
              }
      }, [viewMode]);
    
      // Carrega dados do store
      useEffect(() => {
              setEvents(store.getConsolidatedEvents());
              setConnections([...store.calendarConnections]);
      }, [forceUpdate, showSyncModal]);
    
      // Escuta mudancas do Firestore em tempo real
      useEffect(() => {
              const handler = () => setForceUpdate(p => p + 1);
              window.addEventListener('lyvo:data-changed', handler);
              return () => window.removeEventListener('lyvo:data-changed', handler);
      }, []);
    
      // ─── Google OAuth ──────────────────────────────────────────────────────────
      const loginComGoogle = useGoogleLogin({
              flow: 'auth-code',
              scope: 'https://www.googleapis.com/auth/calendar.events',
              access_type: 'offline',
              prompt: 'consent',
              onSuccess: async (codeResponse) => {
                        try {
                                    setIsSyncing(true);
                                    await googleConnectFn({ code: codeResponse.code });
                                    const result: any = await googleSyncFn({});
                                    setForceUpdate(p => p + 1);
                                    setShowSyncModal(false);
                                    alert(`Sincronizados: ${result.data?.count ?? 0} eventos do Google!`);
                        } catch (error: any) {
                                    console.error('Erro Google:', error);
                                    alert('Falha ao conectar:\n\n' + (error?.message || JSON.stringify(error)));
                        } finally {
                                    setIsSyncing(false);
                        }
              },
              onError: (err) => { console.error(err); alert('Falha no login Google.'); },
      });
    
      const handleManualSync = async () => {
              try {
                        setIsSyncing(true);
                        const result: any = await googleSyncFn({});
                        setForceUpdate(p => p + 1);
                        alert(`Atualizados: ${result.data?.count ?? 0} eventos!`);
              } catch (error: any) {
                        alert('Erro ao sincronizar:\n\n' + (error?.message || JSON.stringify(error)));
              } finally {
                        setIsSyncing(false);
              }
      };
    
      // ─── Navegacao ────────────────────────────────────────────────────────────
      const navigate = (dir: 'prev' | 'next') => {
              const d = new Date(selectedDate);
              const delta = dir === 'next' ? 1 : -1;
              if (viewMode === 'MONTH') d.setMonth(d.getMonth() + delta);
              else if (viewMode === 'WEEK') d.setDate(d.getDate() + delta * 7);
              else d.setDate(d.getDate() + delta);
              setSelectedDate(d);
      };
    
      const goToday = () => setSelectedDate(new Date());
    
      // ─── Helpers de eventos ───────────────────────────────────────────────────
      const getEventsForDate = (date: Date) =>
              events.filter(e => {
                        const ed = new Date(e.dateTime);
                        if (isSameDate(ed, date)) return true;
                        if ((e as any).recurringDays?.includes(date.getDay())) return true;
                        return false;
              });
    
      const getWeekDays = (date: Date): Date[] => {
              const start = new Date(date);
              start.setDate(start.getDate() - start.getDay());
              return Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(start);
                        d.setDate(start.getDate() + i);
                        return d;
              });
      };
    
      // ─── Acoes de evento ──────────────────────────────────────────────────────
      const handleOpenCreate = (date?: Date, hour?: number) => {
              const dt = date ? new Date(date) : new Date(selectedDate);
              if (hour !== undefined) dt.setHours(hour, 0, 0, 0);
              setEditingEvent({ title: '', dateTime: dt.toISOString(), type: 'EVENT', status: 'PENDING', location: '', description: '' });
              setShowEditModal(true);
      };
    
      const handleEditEvent = (event: CalendarEvent) => { setEditingEvent(event); setShowEditModal(true); };
    
      const handleSaveEvent = async () => {
              if (!editingEvent?.title || !editingEvent.dateTime) return;
              try {
                        if (editingEvent.id) await store.updateEvent(editingEvent as CalendarEvent);
                        else await store.addEvent(editingEvent as Omit<CalendarEvent, 'id' | 'source'>);
                        setShowEditModal(false);
                        setEditingEvent(null);
                        setForceUpdate(p => p + 1);
              } catch { alert('Erro ao salvar.'); }
      };
    
      const handleDelete = async (id: string) => {
              if (!confirm('Excluir este compromisso?')) return;
              await store.deleteEvent(id);
              setShowEditModal(false);
              setForceUpdate(p => p + 1);
      };
    
      const toggleConnection = (id: string) => {
              store.toggleConnection(id);
              setConnections([...store.calendarConnections]);
      };
    
      // ─── Titulo do header ──────────────────────────────────────────────────────
      const headerTitle = () => {
              if (viewMode === 'MONTH')
                        return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              if (viewMode === 'WEEK') {
                        const days = getWeekDays(selectedDate);
                        return `${days[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${days[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
              }
              return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      };
    
      // ─── Linha de tempo atual ─────────────────────────────────────────────────
      const CurrentTimeLine: React.FC = () => {
              const now = new Date();
              const pct = (now.getHours() * 60 + now.getMinutes()) / (24 * 60) * 100;
              return (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${pct}%` }}>
                                <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                          <div className="flex-1 h-px bg-red-500" />
                                </div>div>
                        </div>div>
                      );
      };
    
      // ─── Grade horaria (Dia ou Semana) ────────────────────────────────────────
      const renderTimeGrid = (days: Date[]) => (
              <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Header dos dias */}
                    <div className="flex border-b border-gray-200 bg-white shrink-0">
                            <div className="w-14 shrink-0" />
                        {days.map((day, i) => {
                            const isToday = isSameDate(day, new Date());
                            return (
                                            <div key={i} className="flex-1 flex flex-col items-center py-2 border-l border-gray-100 first:border-l-0">
                                                          <span className={`text-xs font-medium uppercase ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                                              {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                                          </span>span>
                                                          <span onClick={() => { setSelectedDate(day); setViewMode('DAY'); }}
                                                                              className={`w-9 h-9 flex items-center justify-center rounded-full cursor-pointer text-xl font-semibold mt-0.5
                                                                                                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}>
                                                              {day.getDate()}
                                                          </span>span>
                                            </div>div>
                                          );
              })}
                    </div>div>
                  {/* Grade com scroll */}
                    <div ref={gridRef} className="flex-1 overflow-y-auto relative">
                            <div className="flex" style={{ minHeight: `${24 * 60}px` }}>
                                {/* Coluna de horas */}
                                      <div className="w-14 shrink-0 relative">
                                          {HOURS.map(h => (
                                <div key={h} className="absolute w-full pr-2 flex justify-end"
                                                    style={{ top: `${h * 60}px`, height: '60px' }}>
                                                <span className="text-[10px] text-gray-400 -mt-2">{formatHour(h)}</span>span>
                                </div>div>
                              ))}
                                      </div>div>
                                {/* Colunas dos dias */}
                                {days.map((day, di) => {
                              const isToday = isSameDate(day, new Date());
                              const dayEvents = getEventsForDate(day);
                              return (
                                                <div key={di} className={`flex-1 relative border-l border-gray-100 ${isToday ? 'bg-blue-50/20' : ''}`}>
                                                    {HOURS.map(h => (
                                                                      <div key={h} className="absolute w-full border-t border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors"
                                                                                              style={{ top: `${h * 60}px`, height: '60px' }}
                                                                                              onClick={() => handleOpenCreate(day, h)} />
                                                                    ))}
                                                    {isToday && <CurrentTimeLine />}
                                                    {dayEvents.map(event => {
                                                                      const dt = new Date(event.dateTime);
                                                                      const top = dt.getHours() * 60 + dt.getMinutes();
                                                                      const clr = getEventColor(event);
                                                                      return (
                                                                                              <div key={event.id}
                                                                                                                        onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                                                                                                        className={`absolute left-1 right-1 rounded-md px-1.5 py-1 cursor-pointer overflow-hidden ${clr.bg} ${clr.text} shadow-sm hover:brightness-90 transition-all z-10`}
                                                                                                                        style={{ top: `${top}px`, minHeight: '22px', maxHeight: '54px' }}>
                                                                                                                    <p className="text-[11px] font-semibold truncate leading-tight">{event.title}</p>p>
                                                                                                                    <p className="text-[10px] opacity-80">{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>p>
                                                                                                  </div>div>
                                                                                            );
                                                })}
                                                </div>div>
                                              );
              })}
                            </div>div>
                    </div>div>
              </div>div>
            );
    
      // ─── Vista mensal ─────────────────────────────────────────────────────────
      const renderMonthView = () => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
              return (
                        <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
                                    {weekDays.map(d => (
                                        <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>div>
                                      ))}
                                </div>div>
                                <div className="flex-1 grid grid-cols-7 border-l border-t border-gray-200 overflow-auto" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
                                    {Array(firstDay).fill(null).map((_, i) => (
                                        <div key={`b${i}`} className="border-r border-b border-gray-200 bg-gray-50/30" />
                                      ))}
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                        const d = new Date(year, month, day);
                                        const isSelected = isSameDate(d, selectedDate);
                                        const isToday = isSameDate(d, today);
                                        const dayEvts = getEventsForDate(d);
                                        return (
                                                          <div key={day}
                                                                              onClick={() => { setSelectedDate(d); setViewMode('DAY'); }}
                                                                              className={`border-r border-b border-gray-200 p-1 cursor-pointer group hover:bg-blue-50/20 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                                                          <div className="flex justify-between items-center mb-0.5">
                                                                                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm
                                                                                                                ${isToday ? 'bg-blue-600 text-white font-bold' :
                                                                                                                                        isSelected ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                                                                                                {day}
                                                                                                </span>span>
                                                                              {dayEvts.length > 3 && (
                                                                                                      <span className="text-[10px] text-blue-500 font-medium">+{dayEvts.length - 3}</span>span>
                                                                                            )}
                                                                          </div>div>
                                                                          <div className="space-y-0.5">
                                                                              {dayEvts.slice(0, 3).map(evt => {
                                                                                                      const clr = getEventColor(evt);
                                                                                                      return (
                                                                                                                                <div key={evt.id}
                                                                                                                                                            onClick={(e) => { e.stopPropagation(); handleEditEvent(evt); }}
                                                                                                                                                            className={`truncate text-[11px] font-medium px-1.5 rounded ${clr.bg} ${clr.text} leading-5`}>
                                                                                                                                    {evt.title}
                                                                                                                                    </div>div>
                                                                                                                              );
                                                                                  })}
                                                                          </div>div>
                                                          </div>div>
                                                        );
                        })}
                                </div>div>
                        </div>div>
                      );
      };
    
      // ─── Render principal ─────────────────────────────────────────────────────
      return (
              <div className="flex h-full bg-white overflow-hidden">
              
                  {/* Sidebar */}
                    <aside className="hidden md:flex flex-col w-52 border-r border-gray-200 bg-white shrink-0 py-4 px-2 gap-4">
                            <button onClick={() => handleOpenCreate()}
                                          className="flex items-center gap-2 border border-gray-300 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow text-gray-700 font-medium text-sm">
                                      <Plus className="w-5 h-5 text-gray-500" />
                                      Novo evento
                            </button>button>
                            <MiniCalendar selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setViewMode('DAY'); }} />
                            <div className="px-1 mt-1">
                                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Calendarios</p>p>
                                {[
                  { label: 'Meus eventos', color: 'bg-green-500' },
                  { label: 'Google Agenda', color: 'bg-blue-500' },
                            ].map(cal => (
                                            <div key={cal.label} className="flex items-center gap-2 py-1">
                                                          <div className={`w-3 h-3 rounded-sm ${cal.color}`} />
                                                          <span className="text-xs text-gray-700">{cal.label}</span>span>
                                            </div>div>
                                          ))}
                            </div>div>
                            <button onClick={handleManualSync} disabled={isSyncing}
                                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 px-1 mt-auto disabled:opacity-50">
                                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Sincronizando...' : 'Atualizar Google Agenda'}
                            </button>button>
                    </aside>aside>
              
                  {/* Area principal */}
                    <div className="flex flex-col flex-1 overflow-hidden">
                    
                        {/* Toolbar */}
                            <header className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
                                      <span className="hidden md:block text-lg font-bold text-gray-800 mr-1">Agenda</span>span>
                                      <button onClick={goToday}
                                                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                  Hoje
                                      </button>button>
                                      <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full">
                                                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                                      </button>button>
                                      <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full">
                                                  <ChevronRight className="w-5 h-5 text-gray-600" />
                                      </button>button>
                                      <h2 className="text-xl font-normal text-gray-800 flex-1 capitalize">{headerTitle()}</h2>h2>
                            
                                {/* Seletor de visualizacao */}
                                      <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                                          {(['DAY', 'WEEK', 'MONTH'] as const).map((mode) => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l first:border-l-0 border-gray-300
                                                                      ${viewMode === mode ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    {mode === 'DAY' ? 'Dia' : mode === 'WEEK' ? 'Semana' : 'Mes'}
                                </button>button>
                              ))}
                                      </div>div>
                            
                                {/* Botao sync mobile */}
                                      <button onClick={() => setShowSyncModal(true)}
                                                      className="md:hidden p-2 hover:bg-gray-100 rounded-full text-gray-600">
                                                  <RefreshCw className="w-5 h-5" />
                                      </button>button>
                            </header>header>
                    
                        {/* Conteudo da agenda */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {viewMode === 'MONTH' && renderMonthView()}
                                {viewMode === 'WEEK' && renderTimeGrid(getWeekDays(selectedDate))}
                                {viewMode === 'DAY' && renderTimeGrid([selectedDate])}
                            </div>div>
                    </div>div>
              
                  {/* FAB mobile */}
                    <button onClick={() => handleOpenCreate()}
                                className="md:hidden absolute bottom-20 right-5 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 hover:bg-blue-700 active:scale-95 transition-all">
                            <Plus className="w-7 h-7" />
                    </button>button>
              
                  {/* Modal Sincronizacao */}
                  {showSyncModal && (
                          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <div className="bg-white w-full sm:w-[90%] max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
                                                <div className="flex justify-between items-center mb-6">
                                                              <h2 className="text-xl font-bold text-gray-800">Sincronizar Agendas</h2>h2>
                                                              <button onClick={() => setShowSyncModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
                                                                              <X className="w-5 h-5" />
                                                              </button>button>
                                                </div>div>
                                                <div className="space-y-4 mb-6">
                                                    {connections.map(conn => (
                                              <div key={conn.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50">
                                                                <div className="flex items-center space-x-3">
                                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conn.source === 'GOOGLE' ? 'bg-white shadow-sm' : 'bg-blue-100'}`}>
                                                                                        {conn.source === 'GOOGLE' ? <span className="font-bold text-blue-500 text-lg">G</span>span> : <span className="font-bold text-blue-600 text-lg">L</span>span>}
                                                                                        </div>div>
                                                                                    <div>
                                                                                                          <p className="font-bold text-gray-800 text-sm">{conn.accountName}</p>p>
                                                                                                          <p className="text-[10px] text-gray-400">
                                                                                                              {conn.connectionStatus === 'CONNECTED'
                                                                                                                                            ? `Sync: ${new Date(conn.lastSyncDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                                                                                                            : 'Desconectado'}
                                                                                                              </p>p>
                                                                                        </div>div>
                                                                </div>div>
                                                                <button onClick={() => toggleConnection(conn.id)}
                                                                                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${conn.connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${conn.connectionStatus === 'CONNECTED' ? 'translate-x-5' : 'translate-x-0'}`} />
                                                                </button>button>
                                              </div>div>
                                            ))}
                                                              <button onClick={() => loginComGoogle()} disabled={isSyncing}
                                                                                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-50 flex items-center justify-center space-x-2 disabled:opacity-50">
                                                                              <Plus className="w-4 h-4" />
                                                                              <span>{isSyncing ? 'Conectando...' : 'Conectar Google Calendar'}</span>span>
                                                              </button>button>
                                                </div>div>
                                                <button onClick={() => { setShowSyncModal(false); setForceUpdate(p => p + 1); }}
                                                                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition">
                                                              Concluido
                                                </button>button>
                                    </div>div>
                          </div>div>
                    )}
              
                  {/* Modal Criar/Editar Evento */}
                  {showEditModal && editingEvent && (
                          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
                                                <div className="flex justify-between items-center mb-5">
                                                              <h2 className="text-xl font-bold text-gray-800">{editingEvent.id ? 'Editar Evento' : 'Novo Evento'}</h2>h2>
                                                              <button onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
                                                                                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                                                              <X className="w-5 h-5" />
                                                              </button>button>
                                                </div>div>
                                                <div className="space-y-3">
                                                              <input type="text" placeholder="Titulo do evento"
                                                                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-blue-400 text-gray-800"
                                                                                  value={editingEvent.title || ''}
                                                                                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} />
                                                
                                                              <div className="flex gap-2">
                                                                  {(['EVENT', 'TASK', 'REMINDER'] as const).map(t => (
                                                <button key={t} onClick={() => setEditingEvent({ ...editingEvent, type: t })}
                                                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${editingEvent.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                                                    {t === 'EVENT' ? 'Evento' : t === 'TASK' ? 'Tarefa' : 'Lembrete'}
                                                </button>button>
                                              ))}
                                                              </div>div>
                                                
                                                              <input type="text" placeholder="Localizacao (opcional)"
                                                                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-blue-400 text-gray-800"
                                                                                  value={(editingEvent as any).location || ''}
                                                                                  onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value } as any)} />
                                                
                                                              <input type="datetime-local"
                                                                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-blue-400 text-gray-800"
                                                                                  value={editingEvent.dateTime ? new Date(editingEvent.dateTime).toISOString().slice(0, 16) : ''}
                                                                                  onChange={e => setEditingEvent({ ...editingEvent, dateTime: new Date(e.target.value).toISOString() })} />
                                                
                                                    {/* Recorrencia semanal */}
                                                              <div>
                                                                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Repetir Semanalmente</label>label>
                                                                              <div className="flex justify-between mt-1 px-1">
                                                                                  {[{ l: 'D', v: 0 }, { l: 'S', v: 1 }, { l: 'T', v: 2 }, { l: 'Q', v: 3 }, { l: 'Q', v: 4 }, { l: 'S', v: 5 }, { l: 'S', v: 6 }].map((day) => {
                                                  const isSel = (editingEvent as any).recurringDays?.includes(day.v);
                                                  return (
                                                                            <button key={day.v} type="button"
                                                                                                        onClick={() => {
                                                                                                                                      const cur = (editingEvent as any).recurringDays || [];
                                                                                                                                      const next = isSel ? cur.filter((d: number) => d !== day.v) : [...cur, day.v];
                                                                                                                                      setEditingEvent({ ...editingEvent, recurringDays: next } as any);
                                                                                                            }}
                                                                                                        className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all border ${isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                                                                                {day.l}
                                                                            </button>button>
                                                                          );
                          })}
                                                                              </div>div>
                                                              </div>div>
                                                
                                                              <div className="flex gap-3 pt-2">
                                                                  {editingEvent.id && (
                                                <button onClick={() => handleDelete(editingEvent.id!)}
                                                                        className="px-5 py-3 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 transition-colors">
                                                                    Excluir
                                                </button>button>
                                                                              )}
                                                                              <button onClick={handleSaveEvent}
                                                                                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors">
                                                                                                Salvar
                                                                              </button>button>
                                                              </div>div>
                                                </div>div>
                                    </div>div>
                          </div>div>
                    )}
              </div>div>
            );
};

export default AgendaView;</div>
