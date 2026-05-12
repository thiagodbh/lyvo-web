import { checkUserAccess } from "./services/accessControl";
import { Timestamp, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Paywall from './components/Paywall';
import AdminPanel from './components/AdminPanel';
import { db } from './services/firebase';
import { store } from './services/firestoreStore';
import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { Settings, LogOut, X, Copy, Check } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import FinanceDashboard from './components/FinanceDashboard';
import AgendaView from './components/AgendaView';
import LandingPage from './components/LandingPage';
import { AppTab } from './types';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ─── Ícones do menu ──────────────────────────────────────────────────────────
const ChatNavIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3C8.477 3 4 7.477 4 13c0 1.74.448 3.377 1.237 4.8L3.9 22.5a.8.8 0 001 1l4.9-1.32A10 10 0 1014 3z"
      fill={active ? '#111827' : '#9ca3af'} />
    <circle cx="10" cy="13" r="1.3" fill="white" />
    <circle cx="14" cy="13" r="1.3" fill="white" />
    <circle cx="18" cy="13" r="1.3" fill="white" />
  </svg>
);

const FinancasNavIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="15" width="6" height="9" rx="1.5" fill={active ? '#16a34a' : '#86efac'} />
    <rect x="11" y="8" width="6" height="16" rx="1.5" fill={active ? '#c2410c' : '#fdba74'} />
    <rect x="19" y="11" width="6" height="13" rx="1.5" fill={active ? '#1d4ed8' : '#93c5fd'} />
    <line x1="2" y1="25" x2="26" y2="25" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const AgendaNavIcon = ({ active }: { active: boolean }) => {
  const now = new Date();
  const day = String(now.getDate());
  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const month = months[now.getMonth()];
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="4" width="24" height="22" rx="3.5" fill="white" stroke="#e5e7eb" strokeWidth="1" />
      <path d="M2 7.5A3.5 3.5 0 015.5 4h17A3.5 3.5 0 0126 7.5V12H2V7.5z" fill={active ? '#b91c1c' : '#ef4444'} />
      <rect x="8" y="2.5" width="2.5" height="5.5" rx="1.25" fill="#6b7280" />
      <rect x="17.5" y="2.5" width="2.5" height="5.5" rx="1.25" fill="#6b7280" />
      <text x="14" y="10.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="Arial,sans-serif">{month}</text>
      <text x="14" y="22.5" textAnchor="middle" fill="#111827" fontSize="10" fontWeight="700" fontFamily="Arial,sans-serif">{day}</text>
    </svg>
  );
};

const PerfilNavIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="10" r="5.5" fill={active ? '#374151' : '#9ca3af'} />
    <path d="M3.5 25c0-5.799 4.701-10.5 10.5-10.5S24.5 19.201 24.5 25" fill={active ? '#374151' : '#9ca3af'} />
  </svg>
);

// ─── Tela de Perfil ───────────────────────────────────────────────────────────
const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number>(0);

  const uid = authService.getCurrentUser()?.uid || '';
  const referralLink = `https://meulyvo.com?ref=${uid}`;
  const shareText = `Olá! Estou usando o Lyvo para organizar minhas finanças e agenda pessoal. É incrível! Acesse pelo meu link e comece agora: ${referralLink}`;

  useEffect(() => {
    if (uid) store.getReferralCount(uid).then(setReferralCount).catch(() => {});
  }, [uid]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(referralLink); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openShare = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const handleNativeShare = async () => {
    if (!('share' in navigator)) return;
    try {
      await (navigator as any).share({
        title: 'Lyvo — Finanças & Agenda',
        text: 'Olá! Estou usando o Lyvo para organizar finanças e agenda. Acesse pelo meu link!',
        url: referralLink,
      });
    } catch {}
  };

  const socialOptions = [
    {
      label: 'WhatsApp',
      bg: '#25D366',
      onClick: () => openShare(`https://wa.me/?text=${encodeURIComponent(shareText)}`),
      icon: (
        <svg viewBox="0 0 32 32" fill="white" className="w-6 h-6">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.444.652 4.74 1.785 6.718L2 30l7.51-1.757A13.94 13.94 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.46 11.46 0 01-5.832-1.594l-.418-.248-4.457 1.042 1.082-4.333-.273-.444A11.46 11.46 0 014.5 16C4.5 9.649 9.649 4.5 16 4.5S27.5 9.649 27.5 16 22.351 27.5 16 27.5zm6.29-8.644c-.345-.173-2.038-1.005-2.354-1.12-.316-.115-.547-.173-.777.173-.23.345-.893 1.12-1.094 1.35-.2.23-.403.258-.748.086-.345-.173-1.458-.537-2.777-1.714-1.027-.916-1.72-2.048-1.921-2.393-.2-.345-.021-.531.15-.703.155-.155.345-.403.518-.605.173-.2.23-.345.345-.575.115-.23.058-.432-.029-.605-.086-.173-.777-1.872-1.065-2.563-.28-.672-.566-.581-.777-.592l-.662-.011c-.23 0-.605.086-.921.432s-1.21 1.18-1.21 2.88 1.24 3.34 1.41 3.57c.173.23 2.44 3.72 5.91 5.218.826.357 1.47.57 1.972.73.828.264 1.583.226 2.179.137.665-.1 2.038-.833 2.326-1.637.287-.803.287-1.492.2-1.637-.086-.143-.316-.23-.661-.403z" />
        </svg>
      ),
    },
    {
      label: 'Telegram',
      bg: '#229ED9',
      onClick: () => openShare(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Olá! Estou usando o Lyvo para organizar finanças e agenda. Incrível!')}`),
      icon: (
        <svg viewBox="0 0 32 32" fill="white" className="w-6 h-6">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm6.874 9.532-2.363 11.13c-.173.778-.636.97-1.287.602l-3.558-2.62-1.716 1.652c-.19.19-.35.35-.717.35l.256-3.624 6.6-5.96c.287-.256-.063-.397-.445-.142l-8.157 5.137-3.514-1.098c-.764-.238-.778-.764.16-1.13l13.74-5.297c.636-.238 1.19.143.98 1z" />
        </svg>
      ),
    },
    {
      label: 'Twitter',
      bg: '#000000',
      onClick: () => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`),
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Facebook',
      bg: '#1877F2',
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`),
      icon: (
        <svg viewBox="0 0 32 32" fill="white" className="w-6 h-6">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 7.056 5.168 12.9 11.938 13.846V20.077h-3.59v-4.077h3.59v-3.107c0-3.547 2.112-5.508 5.347-5.508 1.548 0 3.168.276 3.168.276v3.484h-1.784c-1.758 0-2.307 1.09-2.307 2.21v2.645h3.927l-.628 4.077h-3.299v9.769C24.832 28.9 30 23.056 30 16c0-7.732-6.268-14-14-14z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6">
        <div className="w-24 h-24 bg-lyvo-primary rounded-full flex items-center justify-center shadow-lg mb-4">
          <svg width="44" height="44" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="10" r="5.5" fill="white" />
            <path d="M3.5 25c0-5.799 4.701-10.5 10.5-10.5S24.5 19.201 24.5 25" fill="white" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Meu Perfil</h2>
        <p className="text-gray-500 text-sm text-center mt-1 max-w-xs">
          Gerencie sua conta e preferências do Lyvo.
        </p>
      </div>

      {/* Cartão de indicação */}
      <div className="mx-4 mb-4">
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)' }}>
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">🎁</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">Indique e Ganhe</h3>
              <p className="text-blue-200 text-sm">Compartilhe seu link exclusivo</p>
            </div>
          </div>
          {referralCount > 0 && (
            <div className="bg-white/20 rounded-xl px-4 py-2 mb-3 flex items-center gap-2">
              <span className="text-xl">👥</span>
              <span className="font-bold text-sm">
                {referralCount} {referralCount === 1 ? 'amigo indicado' : 'amigos indicados'}
              </span>
            </div>
          )}
          <p className="text-blue-100 text-sm mb-4 leading-relaxed">
            Indique seus amigos para o Lyvo e ajude-os a organizar as finanças e a agenda de um jeito simples e inteligente!
          </p>
          <button
            onClick={() => setShowReferralModal(true)}
            className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl shadow hover:bg-blue-50 transition-all active:scale-95 text-sm"
          >
            Compartilhar meu link →
          </button>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="mx-4 space-y-3">
        <button className="w-full flex items-center justify-center space-x-2 bg-white p-4 rounded-xl shadow-sm text-gray-700 font-medium border border-gray-100 hover:bg-gray-50 transition">
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full bg-red-50 text-red-500 p-4 rounded-xl font-bold hover:bg-red-100 transition flex items-center justify-center space-x-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Modal de indicação */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

            {/* Cabeçalho do modal */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">🎁 Link de Indicação</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Compartilhe e ajude seus amigos</p>
                </div>
                <button onClick={() => setShowReferralModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Caixa do link */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Seu link exclusivo</p>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-sm font-bold text-blue-700 truncate">{referralLink}</p>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </button>
                </div>
              </div>

              {/* Redes sociais */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Compartilhar via</p>
                <div className="grid grid-cols-4 gap-3">
                  {socialOptions.map(opt => (
                    <button key={opt.label} onClick={opt.onClick}
                      className="flex flex-col items-center gap-1.5 group">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform"
                        style={{ backgroundColor: opt.bg }}>
                        {opt.icon}
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instagram + compartilhar nativo */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <button
                  onClick={() => {
                    handleCopy();
                    setTimeout(() => window.open('https://www.instagram.com/', '_blank', 'noopener'), 400);
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm shadow-sm active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d 50%, #fcb045)' }}
                >
                  <svg viewBox="0 0 32 32" fill="white" className="w-5 h-5">
                    <path d="M16 2.9c3.5 0 3.9 0 5.3.1 3.7.2 5.5 2 5.7 5.7.1 1.3.1 1.7.1 5.3s0 3.9-.1 5.3c-.2 3.7-2 5.5-5.7 5.7-1.4.1-1.8.1-5.3.1s-3.9 0-5.3-.1c-3.7-.2-5.5-2-5.7-5.7C5 17.9 5 17.5 5 14s0-3.9.1-5.3c.2-3.7 2-5.5 5.7-5.7 1.3-.1 1.7-.1 5.2-.1zM16 1c-3.6 0-4 0-5.4.1C6.2 1.3 3.3 4.2 3.1 8.6 3 10 3 10.4 3 14s0 4 .1 5.4c.2 4.4 3.1 7.3 7.5 7.5 1.4.1 1.8.1 5.4.1s4 0 5.4-.1c4.4-.2 7.3-3.1 7.5-7.5.1-1.4.1-1.8.1-5.4s0-4-.1-5.4c-.2-4.4-3.1-7.3-7.5-7.5C20 1 19.6 1 16 1zm0 7.1a5.9 5.9 0 100 11.8A5.9 5.9 0 0016 8.1zm0 9.7a3.8 3.8 0 110-7.6 3.8 3.8 0 010 7.6zM21.9 6.7a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z" />
                  </svg>
                  Instagram
                </button>
                {'share' in navigator ? (
                  <button onClick={handleNativeShare}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-sm active:scale-95 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Compartilhar
                  </button>
                ) : (
                  <button onClick={handleCopy}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm shadow-sm active:scale-95 transition-transform">
                    <Copy className="w-5 h-5" />
                    Copiar link
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.CHAT);

  React.useEffect(() => {
    const unsubscribe = authService.onChange((u) => {
      (async () => {
        if (!u?.uid) {
          store.clearUser();
          setIsAuthenticated(false);
          setIsAuthorized(null);
          return;
        }

        try {
          const userRef = doc(db, "users", u.uid);
          await updateDoc(userRef, {
            lastActiveAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Erro ao registrar atividade:", e);
        }

        store.setUser(u.uid);
        setIsAuthenticated(true);
        setIsAuthorized(null);

        try {
          const allowed = await checkUserAccess(u.uid);
          setIsAuthorized(allowed);
        } catch (error) {
          console.error("Erro no access control:", error);
          setIsAuthorized(false);
        }
      })();
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const handleSignUp = async (userData: any) => {
    const { email, password } = userData;
    await authService.signUp(email, password);
    const u = authService.getCurrentUser();
    if (!u?.uid) return;

    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        name: userData.name || '',
        email: email,
        phone: userData.phone || '',
        birthDate: userData.birthDate || '',
        city: userData.city || '',
        state: userData.state || '',
        gender: userData.gender || '',
        profession: userData.profession || '',
        income: userData.income || '',
        active: false,
        plan: "trial",
        createdAt: serverTimestamp(),
        trialEndsAt: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      }, { merge: true });

      const signUpParams = new URLSearchParams(window.location.search);
      const referredBy = signUpParams.get('ref');
      if (referredBy) {
        store.saveReferral(referredBy, u.uid).catch(() => {});
      }
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentTab(AppTab.CHAT);
    setIsAuthorized(null);
  };

  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium">Carregando...</div>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isAdminView = urlParams.get('view') === 'admin';

  if (isAdminView) {
    return <AdminPanel />;
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  if (isAuthorized === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium">Verificando acesso...</div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <Paywall onLogout={handleLogout} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case AppTab.CHAT: return <ChatInterface />;
      case AppTab.FINANCE: return <FinanceDashboard />;
      case AppTab.AGENDA: return <AgendaView />;
      case AppTab.PROFILE: return <ProfileScreen onLogout={handleLogout} />;
      default: return <ChatInterface />;
    }
  };

  const NavButton = ({ tab, icon, label }: { tab: AppTab; icon: (active: boolean) => React.ReactNode; label: string }) => {
    const isActive = currentTab === tab;
    return (
      <button
        onClick={() => setCurrentTab(tab)}
        className="flex flex-col items-center justify-center gap-0.5 w-full h-full active:scale-95 transition-transform duration-150"
      >
        <div className={`transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-75'}`}>
          {icon(isActive)}
        </div>
        <span className={`text-[10px] transition-all duration-200 ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="w-full bg-gray-50 relative overflow-hidden flex flex-col min-h-[100dvh] h-[100dvh]">
      <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col bg-gray-50 md:bg-white/50 pb-16">
        {renderContent()}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <NavButton tab={AppTab.CHAT} icon={(a) => <ChatNavIcon active={a} />} label="Chat" />
        <NavButton tab={AppTab.FINANCE} icon={(a) => <FinancasNavIcon active={a} />} label="Finanças" />
        <NavButton tab={AppTab.AGENDA} icon={(a) => <AgendaNavIcon active={a} />} label="Agenda" />
        <NavButton tab={AppTab.PROFILE} icon={(a) => <PerfilNavIcon active={a} />} label="Perfil" />
      </nav>
    </div>
  );
}

const RootApp = () => (
  <GoogleOAuthProvider clientId="501648718670-u7pc1vj25rfudk3nfo4mnmvhc9tcgeud.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

export default RootApp;
