import React, { useState } from 'react';
import { 
  MessageCircle, 
  BarChart2, 
  Calendar, 
  Shield, 
  Zap, 
  Users, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star,
  ArrowRight,
  Menu,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onSignUp: (email: string, password: string) => Promise<void> | void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignUp }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
const [phone, setPhone] = useState('');
const [birthDate, setBirthDate] = useState('');
const [city, setCity] = useState('');
const [state, setState] = useState('');
const [gender, setGender] = useState('');
const [profession, setProfession] = useState('');
const [income, setIncome] = useState('');

  // Função para abrir modal direto no Cadastro
  const openSignUpModal = () => {
    setIsSignUp(true);
    setFormError(null);
    setShowLoginModal(true);
  };

  // Função para abrir modal no Login
  const openLoginModal = () => {
    setIsSignUp(false);
    setFormError(null);
    setShowLoginModal(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError(null);

  try {
    if (email && password) {
      if (isSignUp) {
        // Envia o objeto completo com os dados de mapeamento
        await onSignUp(JSON.stringify({
          name, email, password, phone, birthDate, 
          city, state, gender, profession, income
        }) as any);
      } else {
        await onLogin(email, password);
      }

      setShowLoginModal(false);
      // Limpa os campos após o sucesso
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
    }
  } catch (err: any) {
    setFormError(err?.message || 'Erro ao autenticar.');
  }
};

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 scroll-smooth">
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-400"></div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">LYVO<span className="text-blue-500">™</span></span>
          </div>
          
          <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-600">
            <a href="#recursos" className="hover:text-blue-600 transition">Recursos</a>
            <a href="#como-funciona" className="hover:text-blue-600 transition">Como Funciona</a>
            <a href="#depoimentos" className="hover:text-blue-600 transition">Depoimentos</a>
            <a href="#planos" className="hover:text-blue-600 transition">Preços</a>
            <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
             <button 
               onClick={openLoginModal}
               className="text-sm font-bold text-gray-700 hover:text-blue-600 transition"
             >
               Entrar
             </button>
             <a 
               href="#planos"
               className="bg-green-500 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-green-600 transition shadow-lg shadow-green-200"
             >
               Comprar
             </a>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Controle Financeiro e Agenda <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-400">Inteligente</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Organize suas finanças e compromissos em um só lugar. Com inteligência artificial que entende linguagem natural e salva tudo automaticamente.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={openSignUpModal}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg shadow-xl hover:bg-blue-700 transition transform hover:-translate-y-1"
            >
              Começar Agora — 7 dias grátis
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-gray-400 font-medium uppercase tracking-wide">
             <span className="flex items-center">🔒 Dados seguros</span>
             <span className="flex items-center">📱 Funciona em qualquer dispositivo</span>
          </div>
        </div>
      </section>

      {/* --- PROBLEM VS SOLUTION --- */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
               <h3 className="text-2xl font-bold text-gray-800 mb-6 leading-snug">
                 Cansado de planilhas complicadas e apps que não conversam entre si?
               </h3>
               <ul className="space-y-4">
                 {[
                   "Perder tempo organizando dados em planilhas diferentes",
                   "Esquecer compromissos importantes por falta de organização",
                   "Não saber para onde vai seu dinheiro no final do mês",
                   "Apps complexos que exigem muito tempo para configurar"
                 ].map((item, i) => (
                   <li key={i} className="flex items-start">
                     <div className="bg-red-100 p-1 rounded-full mr-3 mt-0.5 flex-shrink-0">
                       <X className="w-4 h-4 text-red-500" />
                     </div>
                     <span className="text-gray-600">{item}</span>
                   </li>
                 ))}
               </ul>
            </div>

            <div className="bg-green-50/50 p-10 rounded-3xl border border-green-100">
               <h3 className="text-2xl font-bold text-gray-800 mb-6 leading-snug">
                 Com o LYVO™, você tem:
               </h3>
               <ul className="space-y-4">
                 {[
                   "Controle financeiro e agenda em um só lugar",
                   "Inteligência artificial que entende linguagem natural",
                   "Tudo salvo automaticamente em tempo real",
                   "Interface simples que qualquer pessoa usa"
                 ].map((item, i) => (
                   <li key={i} className="flex items-start">
                     <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5 flex-shrink-0">
                       <Check className="w-4 h-4 text-green-600" />
                     </div>
                     <span className="text-gray-800 font-medium">{item}</span>
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- RECURSOS --- */}
      <section id="recursos" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recursos que Fazem a Diferença</h2>
            <p className="text-gray-500">Tudo que você precisa para organizar sua vida financeira e pessoal</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle, color: "bg-blue-500", 
                title: "Chat Inteligente", 
                desc: "Converse naturalmente: \"gastei 50 reais no mercado hoje\" e pronto! O sistema entende e organiza automaticamente."
              },
              {
                icon: BarChart2, color: "bg-green-500", 
                title: "Relatórios Visuais", 
                desc: "Gráficos bonitos e fáceis de entender mostram exatamente para onde vai seu dinheiro e como está sua evolução."
              },
              {
                icon: Calendar, color: "bg-purple-500", 
                title: "Agenda Integrada", 
                desc: "Seus compromissos e finanças conectados. Nunca mais esqueça de pagar uma conta ou perder um compromisso importante."
              },
              {
                icon: Shield, color: "bg-red-500", 
                title: "Dados Seguros", 
                desc: "Seus dados ficam salvos localmente no seu dispositivo. Privacidade total e controle completo sobre suas informações."
              },
              {
                icon: Zap, color: "bg-yellow-500", 
                title: "Tempo Real", 
                desc: "Tudo é salvo instantaneamente. Sem perder dados, sem sincronização complicada. Funciona offline e online."
              },
              {
                icon: Users, color: "bg-cyan-500", 
                title: "Para Toda Família", 
                desc: "Interface simples que qualquer pessoa consegue usar. Desde adolescentes até pessoas mais experientes."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PLANOS --- */}
      <section id="planos" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos Simples e Transparentes</h2>
            <p className="text-gray-500">Escolha o que faz mais sentido para você</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Plano Anual - AGORA PRIMEIRO E EM DESTAQUE */}
            <div className="bg-white p-10 rounded-3xl border-2 border-green-400 shadow-xl relative overflow-hidden order-1 md:order-1">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">MELHOR CUSTO-BENEFÍCIO</div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plano Anual</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold text-green-500">R$ 12,49</span>
                <span className="text-gray-500 ml-1">/mês*</span>
              </div>
              <p className="text-sm text-gray-700 font-bold mb-2">Equivalente a R$ 149,90 por ano</p>
              <p className="text-xs text-blue-600 font-medium mb-8 italic">Pague em até 5x de R$ 33,66 no cartão</p>

              <ul className="space-y-4 mb-8 text-sm text-gray-600">
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> <strong>Economize 50%</strong> ao ano</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Parcelamento em até 5x</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Suporte prioritário</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Acesso garantido por 12 meses</li>
              </ul>

              <a 
                href="https://lastlink.com/p/CA05DE2CE/checkout-payment/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition flex items-center justify-center"
              >
                Aproveitar Desconto Anual <ArrowRight className="w-4 h-4 ml-2" />
              </a>
              <p className="text-[10px] text-center text-gray-400 mt-3">*Valor total de R$ 149,90 cobrado anualmente</p>
            </div>

            {/* Plano Mensal - AGORA SEGUNDO */}
            <div className="bg-white p-10 rounded-3xl border border-gray-200 shadow-sm order-2 md:order-2">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plano Mensal</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold text-gray-400">R$ 24,90</span>
                <span className="text-gray-500 ml-1">/mês</span>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-8">Sem fidelidade - cancele quando quiser</p>

              <ul className="space-y-4 mb-8 text-sm text-gray-600">
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Chat inteligente ilimitado</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Controle financeiro completo</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Agenda integrada</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Relatórios e gráficos</li>
              </ul>

              <a 
                href="https://lastlink.com/p/CE5BD085C/checkout-payment/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center"
              >
                Assinar Mensal <ArrowRight className="w-4 h-4 ml-2" />
              </a>
              <p className="text-[10px] text-center text-gray-400 mt-3">Pagamento recorrente via Lastlink</p>
            </div>
          </div>
        </div>
      </section>
      {/* --- FAQ & OUTRAS SEÇÕES (Mantidas conforme original para brevidade) --- */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-500">Tire suas dúvidas sobre o LYVO™</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Como funciona o período gratuito?", a: "Você tem 7 dias para testar todas as funcionalidades sem pagar nada. Não pedimos cartão de crédito para começar. Após o período, você escolhe se quer continuar." },
              { q: "Meus dados ficam seguros?", a: "Sim! Seus dados ficam salvos localmente no seu dispositivo. Você tem controle total sobre suas informações e pode fazer backup quando quiser." },
              { q: "Funciona em qualquer dispositivo?", a: "Sim! O LYVO™ funciona em computadores, tablets e celulares. A interface se adapta automaticamente ao seu dispositivo." },
              { q: "Posso cancelar a qualquer momento?", a: "Claro! Não há fidelidade no plano mensal. Você pode cancelar quando quiser." },
              { q: "Como funciona a inteligência artificial?", a: "Você escreve ou fala naturalmente, como \"gastei 50 no mercado\" ou \"reunião amanhã às 14h\". O sistema entende, categoriza e organiza automaticamente." },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full p-6 text-left flex justify-between items-center focus:outline-none"
                >
                  <span className="font-bold text-gray-800 text-sm">{item.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-500 to-green-400 rounded-[3rem] p-10 md:p-20 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Pronto para Organizar sua Vida?</h2>
            <p className="text-lg opacity-90 mb-10 max-w-2xl mx-auto">Junte-se a milhares de pessoas que já simplificaram suas finanças e agenda com o LYVO™</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={openSignUpModal}
                className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
              >
                Começar Agora — 7 dias grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 text-sm">
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-green-400"></div>
              <span className="text-xl font-bold">LYVO<span className="text-blue-500">™</span></span>
            </div>
            <p className="text-gray-400 max-w-xs leading-relaxed">
              Controle financeiro e agenda inteligente em um só lugar.
            </p>
            <p className="text-gray-500 mt-6 text-xs">© 2026 LYVO™ - CNPJ 36.989.165/0001-85</p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-gray-200">Links Úteis</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-gray-200">Contato</h4>
            <ul className="space-y-3 text-gray-400">
              <li>contato@lyvo.com.br</li>
            </ul>
          </div>
        </div>
      </footer>

     {/* --- LOGIN/SIGNUP MODAL ATUALIZADO --- */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button 
               onClick={() => setShowLoginModal(false)}
               className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
             >
               <X className="w-5 h-5" />
             </button>

             <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {isSignUp ? 'Crie sua Conta Grátis' : 'Acesse sua Conta'}
                </h3>
                <p className="text-gray-500 text-sm mt-2">
                  {isSignUp ? 'Personalize sua experiência no LYVO™' : 'Bem-vindo de volta'}
                </p>
             </div>

             <form onSubmit={handleLoginSubmit} className="space-y-4">
                {isSignUp && (
  /* Mudança: grid-cols-1 por padrão, md:grid-cols-2 apenas em telas maiores */
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in text-left">
    <div className="md:col-span-2">
      <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Nome Completo</label>
      <input type="text" required value={name} onChange={e => setName(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-base" 
        placeholder="Como quer ser chamado?" />
    </div>
    
    {/* WhatsApp e Nascimento agora ficam um embaixo do outro no celular */}
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">WhatsApp</label>
      <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-base" 
        placeholder="(00) 00000-0000" />
    </div>

    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Data de Nascimento</label>
      <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-base" />
    </div>

    {/* Cidade e Estado lado a lado apenas se houver espaço, ou empilhados */}
    <div className="grid grid-cols-3 gap-2 md:block">
      <div className="col-span-2 md:mb-4">
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Cidade</label>
        <input type="text" required value={city} onChange={e => setCity(e.target.value)}
          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-base" 
          placeholder="Sua cidade" />
      </div>
      <div className="md:block">
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">UF</label>
        <input type="text" maxLength={2} required value={state} onChange={e => setState(e.target.value)}
          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-base text-center" 
          placeholder="MG" />
      </div>
    </div>

    {/* Faixa de Renda ocupando a largura total para facilitar a seleção */}
    <div className="md:col-span-2">
      <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Renda Mensal Média</label>
      <select value={income} onChange={e => setIncome(e.target.value)} required
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-base appearance-none">
        <option value="">Selecione a faixa...</option>
        <option value="Até 3k">Até R$ 3.000</option>
        <option value="3k-7k">R$ 3.001 a R$ 7.000</option>
        <option value="7k-15k">R$ 7.001 a R$ 15.000</option>
        <option value="15k-30k">R$ 15.001 a R$ 30.000</option>
        <option value="Acima 30k">Acima de R$ 30.000</option>
      </select>
    </div>
  </div>
)}
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">E-mail</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20" placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Senha</label>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20" placeholder="••••••••" />
                  </div>
                </div>

                {!isSignUp && (
                  <div className="flex justify-end">
                    <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Esqueci minha senha</a>
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg mt-6 shadow-blue-200">
                  {isSignUp ? 'Criar minha conta grátis' : 'Entrar'}
                </button>
             </form>

             {formError && (
               <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                 {formError}
               </div>
             )}

             <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500">
                  {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    {isSignUp ? 'Entrar' : 'Criar conta grátis'}
                  </button>
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
