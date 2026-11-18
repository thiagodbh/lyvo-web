import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useApi, useRoute, go } from '../ctx';
import type { UserRow, UserStatus } from '../types';
import {
  brl, Button, Card, cx, dateBR, downloadCsv, Empty, ErrorBox, inputCls, Loading, PageHeader, ProviderBadge,
  rel, Segmented, StatusBadge, STATUS, useAsync,
} from '../ui';
import UserDrawer from './UserDrawer';

type Filter = 'all' | 'paying' | UserStatus | 'nodoc' | 'incomplete' | 'inactive' | 'idle3' | 'idle7' | 'idle14' | 'idle30';
type SortKey = 'createdAt' | 'lastActiveAt' | 'lastTxAt' | 'periodEnd' | 'totalPaid' | 'tx';
const PAGE = 50;

export default function UsersPage() {
  const api = useApi();
  const { params } = useRoute();
  const { data, error, loading, reload } = useAsync(() => api.listUsers(), [api]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) || 'all');
  const [plan, setPlan] = useState('all');
  const [provider, setProvider] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'createdAt', dir: -1 });
  const [page, setPage] = useState(0);
  const openUid = params.get('uid');

  useEffect(() => { const f = params.get('filter'); if (f) setFilter(f as Filter); }, [params]);
  useEffect(() => setPage(0), [q, filter, plan, provider]);

  const users = data || [];
  const matchFilter = (u: UserRow, f: Filter) => {
    switch (f) {
      case 'all': return true;
      case 'paying': return u.hasAccess && ['active', 'past_due', 'canceled'].includes(u.status);
      case 'nodoc': return !u.hasDoc;
      case 'incomplete': return u.profileCompleteness < 100;
      case 'inactive': return !u.lastActiveAt || Date.now() - u.lastActiveAt > 14 * 864e5;
      // "sumidos": têm acesso agora e não abrem o app há N dias (é com quem vale falar)
      case 'idle3': case 'idle7': case 'idle14': case 'idle30': {
        const n = Number(f.slice(4));
        return u.hasAccess && !u.blocked && (!u.lastActiveAt || Date.now() - u.lastActiveAt >= n * 864e5);
      }
      default: return u.status === f;
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (['all', 'paying', 'trial', 'past_due', 'canceled', 'courtesy', 'trial_expired', 'expired', 'refunded', 'blocked', 'incomplete', 'inactive', 'idle3', 'idle7', 'idle14', 'idle30', 'nodoc'] as Filter[])
      .forEach((f) => { c[f] = users.filter((u) => matchFilter(u, f)).length; });
    return c;
  }, [users]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const val = (u: UserRow): number => {
      switch (sort.key) {
        case 'tx': return u.usage.transactions + u.usage.events;
        case 'lastTxAt': return u.usage.lastTxAt || 0;
        case 'totalPaid': return u.totalPaid;
        default: return (u[sort.key] as number) || 0;
      }
    };
    return users
      .filter((u) => matchFilter(u, filter))
      .filter((u) => plan === 'all' || (plan === 'none' ? !u.planId : u.planId === plan))
      .filter((u) => provider === 'all' || u.provider === provider)
      .filter((u) => !t || [u.email, u.name, u.phone, u.city, u.uid, u.acquisition?.utm_source, u.acquisition?.utm_campaign]
        .some((x) => x && String(x).toLowerCase().includes(t)))
      .sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [users, q, filter, plan, provider, sort]);

  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  const exportCsv = () => downloadCsv(`lyvo-usuarios-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((u) => ({
    uid: u.uid, nome: u.name, email: u.email, telefone: u.phone, cidade: u.city, uf: u.state, renda: u.income, profissao: u.profession,
    status: STATUS[u.status]?.label || u.status, plano: u.planId || '', gateway: u.provider || '',
    cadastro: dateBR(u.createdAt), trial_ate: dateBR(u.trialEndsAt), acesso_ate: dateBR(u.periodEnd), ultimo_acesso: dateBR(u.lastActiveAt), dias_sem_acesso: u.lastActiveAt ? Math.floor((Date.now() - u.lastActiveAt) / 864e5) : '', ultimo_registro: dateBR(u.usage.lastTxAt),
    lancamentos: u.usage.transactions, eventos: u.usage.events, total_pago: u.totalPaid.toFixed(2).replace('.', ','),
    utm_source: u.acquisition?.utm_source || '', utm_campaign: u.acquisition?.utm_campaign || '', indicado_por: u.acquisition?.ref || '',
    perfil_completo: `${u.profileCompleteness}%`,
  })));

  const SortTh = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={cx('px-3 py-2.5 font-medium', right && 'text-right')}>
      <button className={cx('inline-flex items-center gap-1 hover:text-slate-900', sort.key === k && 'text-slate-900')}
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
        {children}<ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader title="Usuários" desc={`${users.length} contas · login + banco cruzados`}
        actions={<Button icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!rows.length}>Exportar CSV ({rows.length})</Button>} />

      <div className="mb-3 space-y-3">
        <Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Todos', count: counts.all },
          { value: 'paying', label: 'Pagantes', count: counts.paying },
          { value: 'trial', label: 'Trial', count: counts.trial },
          { value: 'past_due', label: 'Em atraso', count: counts.past_due },
          { value: 'canceled', label: 'Cancelados', count: counts.canceled },
          { value: 'courtesy', label: 'Cortesia', count: counts.courtesy },
          { value: 'trial_expired', label: 'Trial expirado', count: counts.trial_expired },
          { value: 'expired', label: 'Expirados', count: counts.expired },
          { value: 'refunded', label: 'Reembolsados', count: counts.refunded },
          { value: 'blocked', label: 'Bloqueados', count: counts.blocked },
          { value: 'idle3', label: 'Sumidos 3d+', count: counts.idle3 },
          { value: 'idle7', label: 'Sumidos 7d+', count: counts.idle7 },
          { value: 'idle14', label: 'Sumidos 14d+', count: counts.idle14 },
          { value: 'idle30', label: 'Sumidos 30d+', count: counts.idle30 },
          { value: 'inactive', label: 'Inativos 14d+ (todos)', count: counts.inactive },
          { value: 'incomplete', label: 'Perfil incompleto', count: counts.incomplete },
          { value: 'nodoc', label: 'Sem doc', count: counts.nodoc },
        ]} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={cx(inputCls, 'pl-9')} placeholder="Buscar por nome, e-mail, telefone, cidade, campanha, UID…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={cx(inputCls, 'sm:w-40')} value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="all">Todos os planos</option><option value="annual">Anual</option><option value="monthly">Mensal</option><option value="none">Sem plano</option>
          </select>
          <select className={cx(inputCls, 'sm:w-40')} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="all">Todos gateways</option><option value="olimpopay">Olimpo Pay</option><option value="lastlink">LastLink</option><option value="kiwify">Kiwify</option><option value="hotmart">Hotmart</option><option value="cakto">Cakto</option><option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Usuário</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Plano</th>
                  <SortTh k="periodEnd">Acesso até</SortTh>
                  <SortTh k="lastActiveAt">Último acesso</SortTh>
                  <SortTh k="lastTxAt">Último registro</SortTh>
                  <SortTh k="tx" right>Registros</SortTh>
                  <SortTh k="totalPaid" right>Pago</SortTh>
                  <th className="px-3 py-2.5 font-medium">Origem</th>
                  <SortTh k="createdAt">Cadastro</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((u) => {
                  const accessUntil = u.status === 'trial' || u.status === 'trial_expired' ? u.trialEndsAt : u.periodEnd;
                  return (
                    <tr key={u.uid} onClick={() => go(`users?uid=${u.uid}${filter !== 'all' ? `&filter=${filter}` : ''}`)} className="cursor-pointer hover:bg-slate-50">
                      <td className="max-w-[260px] px-3 py-2.5">
                        <div className="flex items-center gap-1.5 truncate font-medium text-slate-900">
                          {u.name || <span className="italic text-slate-400">sem nome</span>}
                          {u.isAdmin && <span className="rounded bg-slate-900 px-1 text-[10px] font-semibold text-white">ADMIN</span>}
                          {u.notesCount > 0 && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">{u.notesCount} nota{u.notesCount > 1 ? 's' : ''}</span>}
                        </div>
                        <div className="truncate text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700">{u.planId === 'annual' ? 'Anual' : u.planId === 'monthly' ? 'Mensal' : u.planId || '—'}</span>
                          {u.provider && <ProviderBadge provider={u.provider} />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <div className="text-slate-700">{dateBR(accessUntil)}</div>
                        <div className={cx('text-xs', accessUntil && accessUntil < Date.now() ? 'text-slate-400' : 'text-slate-500')}>{accessUntil ? rel(accessUntil) : ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={cx('text-slate-700', u.hasAccess && u.lastActiveAt && Date.now() - u.lastActiveAt >= 7 * 864e5 && 'font-medium text-amber-700')}>{rel(u.lastActiveAt)}</div>
                        {u.lastOpenVia && <div className="text-[11px] text-slate-400">{u.lastOpenVia === 'pwa' ? 'app instalado' : 'navegador'}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{rel(u.usage.lastTxAt)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={cx(u.usage.transactions + u.usage.events === 0 && 'text-rose-500')}>{u.usage.transactions + u.usage.events}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{u.totalPaid ? brl(u.totalPaid) : '—'}</td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-xs text-slate-500">{u.acquisition?.utm_source || (u.acquisition?.ref ? 'indicação' : '—')}</td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-slate-500">{dateBR(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && <Empty title="Nenhum usuário com esses filtros." />}
          </div>
          {rows.length > PAGE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} de {rows.length}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} icon={<ChevronLeft className="h-4 w-4" />} aria-label="Anterior" />
                <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} icon={<ChevronRight className="h-4 w-4" />} aria-label="Próxima" />
              </div>
            </div>
          )}
        </Card>
      )}

      {openUid && (
        <UserDrawer uid={openUid} onClose={() => go(`users${filter !== 'all' ? `?filter=${filter}` : ''}`)} onChanged={reload} />
      )}
    </div>
  );
}
