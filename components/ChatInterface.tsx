
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Camera, TrendingDown, TrendingUp, Calendar, Loader2, X, Check, Bot, ChevronDown, DollarSign, Type as TypeIcon, Tag, CalendarDays, CreditCard as CreditCardIcon, Clock } from 'lucide-react';
import { processUserCommand } from '../services/geminiService';
import { store } from '../services/firestoreStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

type EntryType = 'EXPENSE' | 'INCOME' | 'EVENT';

const DynamicManualEntryModal: React.FC<{
  type: EntryType;
  initialData?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ type, initialData, onClose, onSave }) => {
  const [value, setValue] = useState(initialData?.value?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || initialData?.title || '');
  const [category, setCategory] = useState(initialData?.category || (type === 'INCOME' ? 'Salário' : 'Alimentação'));
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.time || '09:00');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'Dinheiro');
  const [cardId, setCardId] = useState(initialData?.cardId || store.creditCards[0]?.id || '');
  const [installments, setInstallments] = useState(initialData?.installments?.toString() || '1');

  const isCredit = type === 'EXPENSE' && paymentMethod === 'Cartão de Crédito';
  const expenseCategories = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Outros'];
  const incomeCategories = ['Salário', 'Freela', 'Comissão', 'Outros'];

  const primaryColor = type === 'EXPENSE' ? '#3A86FF' : type === 'INCOME' ? '#7AE582' : '#3A86FF';

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-poppins font-black text-gray-900 text-lg uppercase tracking-tight">
            {type === 'EXPENSE' ? 'Nova Despesa' : type === 'INCOME' ? 'Nova Receita' : 'Novo Evento'}
          </h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[65vh]">
          {type !== 'EVENT' ? (
            <div className="flex items-center justify-between group bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
              <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Valor</label>
              <div className="flex items-center text-gray-900">
                <span className="font-black text-2xl mr-1">R$</span>
                <input
                  type="number"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-32 text-right text-3xl outline-none bg-transparent font-black text-gray-900"
                  placeholder="0,00"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60 ml-1">Título</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-black text-sm text-gray-900 outline-none"
              />
            </div>
          )}

          <div className="space-y-5">
            {type !== 'EVENT' && (
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="flex-1 max-w-[180px] text-right text-sm outline-none bg-transparent font-black text-gray-900"
                />
              </div>
            )}

            {type !== 'EVENT' && (
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[11px] font-black text-gray-900 outline-none"
                >
                  {(type === 'EXPENSE' ? expenseCategories : incomeCategories).map(cat => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-right text-sm font-black text-gray-900 outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Horário</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="text-right text-sm font-black text-gray-900 outline-none bg-transparent"
              />
            </div>
          </div>

          {type === 'EXPENSE' && (
            <div className="space-y-4 pt-4 border-t border-gray-50">
              <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-60">Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {['Dinheiro', 'PIX', 'Cartão de Crédito'].map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-3 text-[9px] font-black uppercase rounded-xl transition-all ${
                      paymentMethod === m ? 'bg-[#3A86FF] text-white' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCredit && (
            <div className="space-y-5 pt-6 mt-6 border-t border-gray-100 bg-blue-50/30 p-4 rounded-3xl">
              <label className="block text-[10px] font-black text-gray-900 uppercase ml-1 opacity-60">Cartão de Crédito</label>
              <select
                value={cardId}
                onChange={e => setCardId(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-xs font-black text-gray-900 outline-none"
              >
                {store.creditCards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-900 uppercase opacity-60">Parcelas</label>
                  <select
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-3 text-xs font-black text-gray-900"
                  >
                    {[1, 2, 3, 4, 6, 10, 12].map(n => (
                      <option key={n} value={n.toString()}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-900 uppercase opacity-60">Ciclo Mensal</label>
                  <div className="bg-gray-100/50 p-3 rounded-2xl text-[10px] font-black text-gray-400 text-center uppercase tracking-tighter">
                    Automático
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 flex space-x-3 bg-white border-t border-gray-50">
          <button
            onClick={() => onSave({ type, value, description, category, date, time, paymentMethod, cardId, installments })}
            style={{ backgroundColor: primaryColor }}
            className="flex-[4] text-white py-4 rounded-2xl font-poppins font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl"
          >
            Confirmar
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl flex items-center justify-center font-black">
            X
          </button>
        </div>
      </div>
    </div>
  );
};



const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{ id: '1', role: 'assistant', content: 'Olá! Sou o Lyvo. 🤖\n\nEstou pronto para ouvir você ou analisar seus recibos. O que vamos organizar hoje?' }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeModal, setActiveModal] = useState<EntryType | null>(null);
  const [modalInitialData, setModalInitialData] = useState<any>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // --- Multimodal: Audio Input (Speech Recognition) ---
  const handleAudioInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
        setIsListening(false);
        alert("Erro ao capturar áudio.");
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSendMessage(transcript);
    };

    recognition.start();
  };

  // --- Multimodal: Camera Input (Vision) ---
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      // We send a default message while analyzing
      handleSendMessage("Analisando este recibo...", reader.result as string, base64);
    };
    reader.readAsDataURL(file);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  /**
   * SAFETY HANDLER: handleSendMessage with mandatory finally block.
   */
  const handleSendMessage = async (textOverride?: string, imageDisplay?: string, imageBase64?: string) => {
    const text = textOverride || inputText;
    if (!text.trim() && !imageBase64) return;
    
    setIsLoading(true);
    // If it's a camera upload, the textOverride is "Analisando..."
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, image: imageDisplay }]);
    setInputText('');

    try {
      const res = await processUserCommand(text, imageBase64);
      
      if (res.data && res.data.action !== 'UNKNOWN') {
          const action = res.data.action;
          const details = res.data.transactionDetails || res.data.eventDetails || {};
          
          let type: EntryType = 'EXPENSE';
          if (action === 'ADD_EVENT') type = 'EVENT';
          else if (details.type === 'INCOME') type = 'INCOME';

          setModalInitialData({
              ...details,
              paymentMethod: action === 'ADD_CREDIT_TRANSACTION' ? 'Cartão de Crédito' : 'Dinheiro',
              cardId: store.creditCards.find(c => c.name.toLowerCase().includes(details.cardName?.toLowerCase() || ''))?.id
          });
          
          if (res.message) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: res.message }]);
          }
          setActiveModal(type);
      } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: res.message || "Pode me dar mais detalhes?" }]);
      }
    } catch (e) {
      console.error("Chat Error:", e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Ops! Tive um problema técnico. Tente novamente." }]);
    } finally {
      // THE MANDATORY RESET: This kills the infinite thinking hang.
      setIsLoading(false); 
    }
  };

  const handleManualEntry = (type: EntryType) => {
    setModalInitialData(null);
    setActiveModal(type);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] relative overflow-hidden"> 
      {/* Visual Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-sm z-10 rounded-b-[2.5rem] w-full p-6 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-lyvo-primary flex items-center justify-center text-white shadow-lg"><Bot /></div>
            <div>
                <h1 className="font-poppins font-black text-gray-900 text-xl tracking-tight leading-none">Lyvo Assistente</h1>
                <div className="flex items-center space-x-1 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{isListening ? 'Ouvindo...' : 'Ativo'}</p>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleManualEntry('EXPENSE')} className="py-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-black text-[9px] uppercase flex flex-col items-center active:scale-95 transition-all"><TrendingDown className="w-5 h-5 mb-1" /> Despesa</button>
            <button onClick={() => handleManualEntry('INCOME')} className="py-3 bg-green-50 text-green-600 rounded-2xl border border-green-100 font-black text-[9px] uppercase flex flex-col items-center active:scale-95 transition-all"><TrendingUp className="w-5 h-5 mb-1" /> Receita</button>
            <button onClick={() => handleManualEntry('EVENT')} className="py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 font-black text-[9px] uppercase flex flex-col items-center active:scale-95 transition-all"><Calendar className="w-5 h-5 mb-1" /> Evento</button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-[1.5rem] shadow-sm relative ${msg.role === 'user' ? 'bg-[#3A86FF] text-white rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
              {msg.image && <img src={msg.image} className="w-full rounded-xl mb-3 border border-gray-100 shadow-inner" alt="Recibo" />}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-[1.5rem] shadow-sm flex items-center space-x-3 border border-gray-100">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3A86FF]" />
                    <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Lyvo está processando...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="bg-white p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex items-center space-x-2 pb-8">
        <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-1 border border-gray-100">
             <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite ou use áudio/câmera..."
              className="flex-1 bg-transparent px-2 py-3 outline-none text-gray-900 text-sm font-medium" 
            />
            <div className="flex items-center space-x-1 text-gray-400">
                <button 
                  onClick={() => cameraInputRef.current?.click()} 
                  className="p-2 hover:text-[#3A86FF] transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  onChange={handleCameraInput} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />
                <button 
                  onClick={handleAudioInput} 
                  className={`p-2 transition-all ${isListening ? 'text-red-500 scale-125' : 'hover:text-[#3A86FF]'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
            </div>
        </div>
        <button onClick={() => handleSendMessage()} disabled={!inputText.trim()} className={`p-4 rounded-full shadow-lg transition-all active:scale-90 ${inputText.trim() ? 'bg-[#3A86FF] text-white' : 'bg-gray-200 text-gray-400'}`}>
            <Send className="w-5 h-5" />
        </button>
      </div>

            {/* Manual Entry Modals */}
      {activeModal && (
        <DynamicManualEntryModal
          type={activeModal}
          initialData={modalInitialData}
          onClose={() => { setActiveModal(null); setModalInitialData(null); }}
          onSave={async (data) => {
            try {
              if (data.type === 'EVENT') {
                await store.addEvent({
                  title: data.description || data.title,
                  dateTime: `${data.date}T${data.time}:00`,
                  description: data.notes,
                });
              } else {
                const isCredit = data.paymentMethod === 'Cartão de Crédito';

                await store.addTransaction(
                  {
                    type: data.type as any,
                    value: parseFloat(data.value),
                    category: data.category,
                    description: data.description,
                    date: new Date(data.date).toISOString(),
                    ...(isCredit && data.cardId ? { relatedCardId: data.cardId } : {}),
                  },
                  isCredit ? parseInt(data.installments || '1', 10) : 1
                );
              }

              window.dispatchEvent(new Event('lyvo:data-changed'));

              setActiveModal(null);
              setModalInitialData(null);
              setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: 'assistant', content: '✅ Registrado com sucesso!' },
              ]);
            } catch (e) {
              console.error('SAVE ERROR:', e);
              setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: 'assistant', content: '❌ Não consegui salvar. Veja o console.' },
              ]);
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;
