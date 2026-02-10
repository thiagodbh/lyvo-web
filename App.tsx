import AccessGuard from './components/AccessGuard';
import Paywall from './components/Paywall';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from './services/firebase';
import { store } from './services/firestoreStore';
import React, { useState } from 'react';
import { authService } from './services/authService';
import { MessageCircle, PieChart, Calendar, User, Settings, LogOut } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import FinanceDashboard from './components/FinanceDashboard';
import AgendaView from './components/AgendaView';
import LandingPage from './components/LandingPage';
import { AppTab } from './types';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Placeholder for Profile Screen
const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
    <div className="w-24 h-24 bg-lyvo-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
      <User className="w-10 h-10" />
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
  const unsubscribe = authService.onChange(async (u) => {
    if (!u?.uid) {
      store.clearUser();
      setIsAuthenticated(false);
      setIsAuthorized(null);
      return;
    }

    store.setUser(u.uid);
    setIsAuthenticated(true);

    setIsAuthorized(null);

    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      setIsAuthorized(snap.exists() && snap.data()?.active === true);
    } catch {
      setIsAuthorized(false);
    }
  });

  return () => unsubscribe?.();
}, []);


  const handleLogin = async (email: string, password: string) => {
  await authService.signIn(email, password);
};

const handleSignUp = async (email: string, password: string) => {
  await authService.signUp(email, password);

  const u = authService.getCurrentUser();
  if (!u?.uid) return;

  const userRef = doc(db, "users", u.uid);
  const snap = await getDoc(userRef);

  // cria o cadastro do usuário no Firestore (uma única vez)
  if (!snap.exists()) {
    await setDoc(userRef, {
      email,
      active: false,          // começa bloqueado
      plan: "free",
      createdAt: serverTimestamp(),
    });
  }
};

  const handleLogout = async () => {
  await authService.signOut();
  setCurrentTab(AppTab.CHAT);
  setIsAuthorized(null);
};


  // --- Authenticated Layout (Responsive with Fixed Bottom Nav) ---
  if (isAuthenticated === null) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 font-medium">Carregando...</div>
    </div>
  );
}
if (isAuthenticated && isAuthorized === null) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 font-medium">Verificando acesso...</div>
    </div>
  );
}


  if (isAuthenticated) {
    const renderContent = () => {
      switch (currentTab) {
        case AppTab.CHAT:
          return <ChatInterface />;
        case AppTab.FINANCE:
          return <FinanceDashboard />;
        case AppTab.AGENDA:
          return <AgendaView />;
        case AppTab.PROFILE:
          return <ProfileScreen onLogout={handleLogout} />;
        default:
          return <ChatInterface />;
      }
    };

    const NavButton = ({ tab, icon: Icon, label }: { tab: AppTab; icon: any; label: string }) => {
      const isActive = currentTab === tab;
      return (
        <button 
          onClick={() => setCurrentTab(tab)}
          className={`
            flex flex-col items-center justify-center transition-all duration-200 space-y-1 w-full h-full active:scale-95
            ${isActive ? 'text-lyvo-primary' : 'text-gray-400 hover:text-gray-600'}
          `}
        >
          <Icon
            className={`
              w-6 h-6 
              ${isActive ? 'fill-current' : ''} transition-all duration-300
            `}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span
            className={`
              text-[10px] 
              font-medium ${isActive ? 'font-bold' : ''}
            `}
          >
            {label}
          </span>
        </button>
      );
    };

    return (
      <AccessGuard paywallComponent={<Paywall />}>
        <div className="w-full bg-gray-50 relative overflow-hidden flex flex-col min-h-[100dvh] h-[100dvh]">
          {/* MAIN CONTENT AREA - Padding bottom matched to nav height */}
          <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col bg-gray-50 md:bg-white/50 pb-16">
            {renderContent()}
          </main>

          {/* BOTTOM NAV (STRICTLY FIXED AT BOTTOM) */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <NavButton tab={AppTab.CHAT} icon={MessageCircle} label="Chat" />
            <NavButton tab={AppTab.FINANCE} icon={PieChart} label="Finanças" />
            <NavButton tab={AppTab.AGENDA} icon={Calendar} label="Agenda" />
            <NavButton tab={AppTab.PROFILE} icon={User} label="Perfil" />
          </nav>
        </div>
      </AccessGuard>
    );

        {/* BOTTOM NAV (STRICTLY FIXED AT BOTTOM) */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <NavButton tab={AppTab.CHAT} icon={MessageCircle} label="Chat" />
          <NavButton tab={AppTab.FINANCE} icon={PieChart} label="Finanças" />
          <NavButton tab={AppTab.AGENDA} icon={Calendar} label="Agenda" />
          <NavButton tab={AppTab.PROFILE} icon={User} label="Perfil" />
        </nav>
      </div>
    );
  }

  // --- Unauthenticated Layout (Landing Page) ---
  return <LandingPage onLogin={handleLogin} onSignUp={handleSignUp} />;
}

const RootApp = () => (
  <GoogleOAuthProvider clientId="501648718670-u7pc1vj25rfudk3nfo4mnmvhc9tcgeud.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

export default RootApp;
