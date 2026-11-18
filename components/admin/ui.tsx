import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, Loader2, Copy, Check } from 'lucide-react';
import type { ProviderId, UserStatus } from './types';

// ─── formatação ─────────────────────────────────────────────────────────────
export const brl = (v: number | null | undefined, compact = false) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: compact ? 0 : 2, minimumFractionDigits: compact ? 0 : 2 });
export const pct = (v: number | null | undefined, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits).replace('.', ',')}%`);
export const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR'));
export const dateBR = (t: number | null | undefined, withTime = false) =>
  !t ? '—' : new Date(t).toLocaleString('pt-BR', withTime
    ? { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
export function rel(t: number | null | undefined): string {
  if (!t) return 'nunca';
  const d = t - Date.now();
  const a = Math.abs(d);
  const f = (n: number, u: string) => (d < 0 ? `há ${n} ${u}` : `em ${n} ${u}`);
  if (a < 60e3) return d < 0 ? 'agora' : 'em instantes';
  if (a < 3600e3) return f(Math.round(a / 60e3), 'min');
  if (a < 864e5) return f(Math.round(a / 3600e3), 'h');
  if (a < 30 * 864e5) { const n = Math.round(a / 864e5); return f(n, n === 1 ? 'dia' : 'dias'); }
  const n = Math.round(a / (30 * 864e5)); return f(n, n === 1 ? 'mês' : 'meses');
}
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ─── status ─────────────────────────────────────────────────────────────────
export const STATUS: Record<UserStatus, { label: string; cls: string; dot: string }> = {
  active: { label: 'Ativo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  past_due: { label: 'Em atraso', cls: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500' },
  canceled: { label: 'Cancelado (no período)', cls: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  courtesy: { label: 'Cortesia', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
  trial: { label: 'Trial', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  trial_expired: { label: 'Trial expirado', cls: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  expired: { label: 'Expirado', cls: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  refunded: { label: 'Reembolsado', cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
  blocked: { label: 'Bloqueado', cls: 'bg-rose-100 text-rose-800 ring-rose-700/30', dot: 'bg-rose-700' },
};
const SUB_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  waiting: { label: 'Aguardando 1º pagamento', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  abandoned: { label: 'Abandonada', cls: 'bg-slate-100 text-slate-500 ring-slate-500/20', dot: 'bg-slate-300' },
};

export function StatusBadge({ status }: { status: UserStatus | string }) {
  const s = STATUS[status as UserStatus] || SUB_STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', s.cls)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />{s.label}
    </span>
  );
}

export const PROVIDER_LABEL: Record<string, string> = { olimpopay: 'Olimpo Pay', lastlink: 'LastLink', kiwify: 'Kiwify', hotmart: 'Hotmart', cakto: 'Cakto', manual: 'Manual' };
const PROVIDER_CLS: Record<string, string> = {
  olimpopay: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  lastlink: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', kiwify: 'bg-lime-50 text-lime-800 ring-lime-600/25',
  hotmart: 'bg-orange-50 text-orange-700 ring-orange-600/20', cakto: 'bg-cyan-50 text-cyan-800 ring-cyan-600/20',
  manual: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export function ProviderBadge({ provider }: { provider: ProviderId | 'manual' | string | null }) {
  if (!provider) return <span className="text-slate-400">—</span>;
  return <span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', PROVIDER_CLS[provider] || PROVIDER_CLS.manual)}>{PROVIDER_LABEL[provider] || provider}</span>;
}

export function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet' }) {
  const t = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20', green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/20', amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/20', violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', t)}>{children}</span>;
}

// ─── layout ─────────────────────────────────────────────────────────────────
export function Card({ title, action, children, className, pad = true }: { key?: any; title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('rounded-xl bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone, hint }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'up' | 'down' | 'warn'; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" title={hint}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      {sub && <div className={cx('mt-1 text-xs tabular-nums', tone === 'up' ? 'text-emerald-600' : tone === 'down' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-700' : 'text-slate-500')}>{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ─── controles ──────────────────────────────────────────────────────────────
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean; icon?: React.ReactNode };
export function Button({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant];
  const s = size === 'sm' ? 'h-8 px-2.5 text-xs gap-1.5' : 'h-9 px-3.5 text-sm gap-2';
  return (
    <button {...rest} disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500', v, s, className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}{children}
    </button>
  );
}

export const inputCls = 'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2">
      <span className={cx('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors', checked ? 'bg-teal-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx('whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition', value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
          {o.label}{o.count != null && <span className="ml-1.5 tabular-nums text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(text); } catch { /* sem permissão */ } setOk(true); setTimeout(() => setOk(false), 1800); }}
      icon={ok ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}>{ok ? 'Copiado' : label}</Button>
  );
}

// ─── overlays ───────────────────────────────────────────────────────────────
function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEsc(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl flex flex-col', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, title, subtitle }: { open: boolean; onClose: () => void; children: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }) {
  useEsc(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/30 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside className="flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900">{title}</div>
            {subtitle && <div className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

// ─── toast ──────────────────────────────────────────────────────────────────
type Toast = { id: number; text: string; tone: 'ok' | 'err' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ring-1', t.tone === 'ok' ? 'bg-slate-900 text-white ring-slate-800' : 'bg-rose-600 text-white ring-rose-700')}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─── estados ────────────────────────────────────────────────────────────────
export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}
export function Empty({ title, desc }: { title: string; desc?: string }) {
  return <div className="py-12 text-center"><div className="text-sm font-medium text-slate-700">{title}</div>{desc && <div className="mt-1 text-sm text-slate-500">{desc}</div>}</div>;
}
export function ErrorBox({ error, onRetry }: { error: any; onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
      <div className="font-medium">Não foi possível carregar.</div>
      <div className="mt-1 text-rose-700">{String(error?.message || error)}</div>
      {onRetry && <Button size="sm" className="mt-3" onClick={onRetry}>Tentar de novo</Button>}
    </div>
  );
}

/** Carrega dados assíncronos com estado de loading/erro e reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{ data: T | null; error: any; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Exporta linhas para CSV (abre no Excel com acentos). */
export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
