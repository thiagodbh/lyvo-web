import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Users, Repeat, Receipt, Package, PlugZap, ScrollText, Menu, LogOut, ShieldAlert, FlaskConical,
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { createLiveApi, DEMO_ALLOWED } from './api';
import { createDemoApi } from './demo';
import type { AdminApi } from './types';
import { Button, cx, inputCls, Loading, ToastProvider } from './ui';
import { ApiCtx, useRoute } from './ctx';
import OverviewPage from './pages/Overview';
import UsersPage from './pages/Users';
import SubscriptionsPage from './pages/Subscriptions';
import PaymentsPage from './pages/Payments';
import PlansPage from './pages/Plans';
import GatewaysPage from './pages/Gateways';
import AuditPage from './pages/Audit';

const NAV = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'subscriptions', label: 'Assinaturas', icon: Repeat },
  { id: 'payments', label: 'Pagamentos', icon: Receipt },
  { id: 'plans', label: 'Planos', icon: Package },
  { id: 'gateways', label: 'Gateways', icon: PlugZap },
  { id: 'audit', label: 'Auditoria', icon: ScrollText },
];

function Shell({ api, email, onLogout }: { api: AdminApi; email: string; onLogout?: () => void }) {
  const { path } = useRoute();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [path]);

  const page = useMemo(() => {
    switch (path) {
      case 'users': return <UsersPage />;
      case 'subscriptions': return <SubscriptionsPage />;
      case 'payments': return <PaymentsPage />;
      case 'plans': return <PlansPage />;
      case 'gateways': return <GatewaysPage />;
      case 'audit': return <AuditPage />;
      default: return <OverviewPage />;
    }
  }, [path]);

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-slate-950">L</div>
        <div>
          <div className="text-sm font-semibold text-white">Lyvo Admin</div>
          <div className="text-[11px] text-slate-400">Operação & Receita</div>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 px-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = path === n.id || (path === '' && n.id === 'overview');
          return (
            <a key={n.id} href={`#/${n.id}`}
              className={cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')}>
              <Icon className="h-4 w-4" />{n.label}
            </a>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3">
        {api.mode === 'demo' && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-400/10 p-2.5 text-[11px] leading-snug text-amber-200 ring-1 ring-amber-400/20">
            <FlaskConical className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            Modo demonstração. Dados fictícios; nada é gravado.
          </div>
        )}
        <div className="truncate px-1 text-xs text-slate-400">{email}</div>
        {onLogout && (
          <button onClick={onLogout} className="mt-2 flex items-center gap-2 px-1 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" />Sair
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <ApiCtx.Provider value={api}>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-slate-950 lg:block">{nav}</aside>
          {menu && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenu(false)}>
              <div className="absolute inset-0 bg-slate-900/50" />
              <aside className="absolute inset-y-0 left-0 w-64 bg-slate-950" onClick={(e) => e.stopPropagation()}>{nav}</aside>
            </div>
          )}
          <div className="lg:pl-60">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
              <button onClick={() => setMenu(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Menu"><Menu className="h-5 w-5" /></button>
              <span className="text-sm font-semibold">{NAV.find((n) => n.id === path)?.label || 'Visão geral'}</span>
              {api.mode === 'demo' && <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Demo</span>}
            </header>
            <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{page}</main>
          </div>
        </div>
      </ToastProvider>
    </ApiCtx.Provider>
  );
}

function AdminLogin({ error }: { error?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error || '');
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr('');
        try { await signInWithEmailAndPassword(auth, email.trim(), password); }
        catch { setErr('E-mail ou senha inválidos.'); }
        finally { setBusy(false); }
      }}>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 font-black text-slate-950">L</div>
          <div><div className="font-semibold">Lyvo Admin</div><div className="text-xs text-slate-500">Acesso restrito</div></div>
        </div>
        <div className="space-y-3">
          <input className={inputCls} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          <input className={inputCls} type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
        <Button variant="primary" className="mt-4 w-full" loading={busy} type="submit">Entrar</Button>
      </form>
    </div>
  );
}

function Denied({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-lg font-semibold">Sem permissão</h1>
        <p className="mt-1 text-sm text-slate-500">A conta {email} não é administradora.</p>
        <Button className="mt-4" onClick={() => signOut(auth)}>Trocar de conta</Button>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const demo = DEMO_ALLOWED && new URLSearchParams(window.location.search).get('demo') === '1';
  const demoApi = useMemo(() => (demo ? createDemoApi() : null), [demo]);
  const liveApi = useMemo(() => (demo ? null : createLiveApi()), [demo]);
  const [state, setState] = useState<{ phase: 'loading' | 'login' | 'denied' | 'ok'; email?: string }>({ phase: 'loading' });

  useEffect(() => {
    if (demo) return;
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setState({ phase: 'login' }); return; }
      try {
        const me = await liveApi!.whoami();
        setState({ phase: 'ok', email: me.email });
      } catch {
        setState({ phase: 'denied', email: u.email || '' });
      }
    });
  }, [demo, liveApi]);

  if (demo) return <Shell api={demoApi!} email="admin@exemplo.com (demo)" />;
  if (state.phase === 'loading') return <Loading label="Verificando acesso…" />;
  if (state.phase === 'login') return <AdminLogin />;
  if (state.phase === 'denied') return <Denied email={state.email || ''} />;
  return <Shell api={liveApi!} email={state.email || ''} onLogout={() => signOut(auth)} />;
}
