import Paywall from './components/Paywall';
import AccessGuard from './components/AccessGuard';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from './services/firebase';
import { store } from './services/firestoreStore';
import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { MessageCircle, PieChart, Calendar, User, Settings, LogOut } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import FinanceDashboard from './components/FinanceDashboard';
import AgendaView from './components/AgendaView';
import LandingPage from './components/LandingPage';
import { AppTab } from './types';
import { GoogleOAuthProvider } from '@react-oauth/google';

const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
    <div className="w-24 h-24 bg-lyvo-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
      <User className="w-10 h-10" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800">Meu Perfil</h2>
    <p className="text-gray-500 text-center mt-2 max-w-xs">Gerencie sua conta e preferências.</p>
    <div className="mt-8 w-full max-w-xs space-y-3">
      <button className="w-full flex items-center justify-center space-x-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100"><Settings className="w-5 h-5" /><span>Configurações</span></button>
      <button onClick={onLogout} className="w-full bg-red-50 text-red-500 p-4 rounded-xl font-bold flex items-center justify-center space-x-2"><LogOut className="w-5 h-5" /><span>Sair</span></button>
    </div>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.CHAT);

  useEffect(() => {
    const unsubscribe = authService.onChange(async (u) => {
      if (!u?.uid) {
        store.clearUser();
        setIsAuthenticated(false);
        return;
      }
      store.setUser(u.uid);
      setIsAuthenticated(true);
    });
    return () => unsubscribe?.();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      await authService.signUp(email, password);
      const u = authService.getCurrentUser();
      if (!u?.uid) return;
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email,
          active: false,
          plan: "trial",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentTab(AppTab.CHAT);
  };

  if (isAuthenticated === null) return <div className="h-screen w-full flex items-center justify-center bg-gray-50">Carregando...</div>;

  if (isAuthenticated) {
    const renderContent = () => {
      switch (currentTab) {
        case AppTab.CHAT: return <ChatInterface />;
        case AppTab.FINANCE: return <FinanceDashboard />;
        case AppTab.AGENDA: return <AgendaView />;
        case AppTab.PROFILE: return <ProfileScreen onLogout={handleLogout} />;
        default: return <ChatInterface />;
      }
    };

    const NavButton = ({ tab, icon: Icon, label }: { tab: AppTab; icon: any; label: string }) => {
      const isActive = currentTab === tab;
      return (
        <button onClick={() => setCurrentTab(tab)} className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-lyvo-primary' : 'text-gray-400'}`}>
          <Icon className="w-6 h-6" />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      );
    };

    return (
      <AccessGuard paywallComponent={<Paywall onLogout={handleLogout} />}>
        <div className="w-full bg-gray-50 relative flex flex-col h-[100dvh]">
          <main className="flex-1 overflow-hidden relative pb-16">{renderContent()}</main>
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around z-50">
            <NavButton tab={AppTab.CHAT} icon={MessageCircle} label="Chat" />
            <NavButton tab={AppTab.FINANCE} icon={PieChart} label="Finanças" />
            <NavButton tab={AppTab.AGENDA} icon={Calendar} label="Agenda" />
            <NavButton tab={AppTab.PROFILE} icon={User} label="Perfil" />
          </nav>
        </div>
      </AccessGuard>
    );
  }

  return <LandingPage onLogin={handleLogin} onSignUp={handleSignUp} />;
}

const RootApp = () => (
  <GoogleOAuthProvider clientId="501648718670-u7pc1vj25rfudk3nfo4mnmvhc9tcgeud.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

export default RootApp;
