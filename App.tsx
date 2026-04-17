import { checkUserAccess } from "./services/accessControl";
import { Timestamp, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Paywall from './components/Paywall';
import AdminPanel from './components/AdminPanel';
import { db } from './services/firebase';
import { store } from './services/firestoreStore';
import React, { useState } from 'react';
import { authService } from './services/authService';
import { Settings, LogOut } from 'lucide-react';
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
const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
    <div className="w-24 h-24 bg-lyvo-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
      <svg width="44" height="44" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="5.5" fill="white" />
        <path d="M3.5 25c0-5.799 4.701-10.5 10.5-10.5S24.5 19.201 24.5 25" fill="white" />
      </svg>
    </div>
    <h2 className="text-2xl font-bold text-gray-800">Meu Perfil</h2>
    <p className="text-gray-500 text-center mt-2 max-w-xs">
      Gerencie sua conta, suas conexões bancárias e preferências do Lyvo.
    </p>
    <div className="mt-8 w-full max-w-xs space-y-3">
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
  </div>
);

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
