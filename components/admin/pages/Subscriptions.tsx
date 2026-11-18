import { useEffect, useMemo, useState } from 'react';
import { useApi, useRoute, go } from '../ctx';
import type { UserRow } from '../types';
import { brl, Card, cx, dateBR, Empty, ErrorBox, Kpi, Loading, PageHeader, ProviderBadge, rel, Segmented, StatusBadge, useAsync } from '../ui';

type F = 'renew7' | 'renew30' | 'past_due' | 'canceled' | 'courtesy' | 'all' | 'gateway';
const DAY = 864e5;

export default function SubscriptionsPage() {
  const api = useApi();
  const { params } = useRoute();
  const users = useAsync(() => api.listUsers(), [api]);
  const billing = useAsync(() => api.listBilling(), [api]);
  const cfg = useAsync(() => api.getConfig(), [api]);
  const priceOf = (planId: string | null) => cfg.data?.plans.find((p) => p.id === planId)?.price || 0;
  const [f, setF] = useState<F>((params.get('filter') as F) || 'renew30');
  useEffect(() => { const x = params.get('filter'); if (x) setF(x as F); }, [params]);

  const now = Date.now();
  const paid = (users.data || []).filter((u) => u.planId && ['active', 'past_due', 'canceled', 'courtesy'].includes(u.status));
  const sel: Record<Exclude<F, 'gateway'>, (u: UserRow) => boolean> = {
    renew7: (u) => ['active', 'past_due'].includes(u.status) && !!u.periodEnd && u.periodEnd - now < 7 * DAY,
    renew30: (u) => ['active', 'past_due'].includes(u.status) && !!u.periodEnd && u.periodEnd - now < 30 * DAY,
    past_due: (u) => u.status === 'past_due',
    canceled: (u) => u.status === 'canceled',
    courtesy: (u) => u.status === 'courtesy',
    all: () => true,
  };
  const list = useMemo(() => (f === 'gateway' ? [] : paid.filter(sel[f]).sort((a, b) => (a.periodEnd || 0) - (b.periodEnd || 0))), [paid, f]);
  const n = (k: Exclude<F, 'gateway'>) => paid.filter(sel[k]).length;
  const subs = billing.data?.subscriptions || [];

  if (users.error) return <ErrorBox error={users.error} onRetry={users.reload} />;
  if (users.loading && !users.data) return <Loading />;

  return (
    <div>
      <PageHeader title="Assinaturas e renovações" desc="Quem renova, quem está em atraso, quem cancelou e até quando tem acesso." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Renovam em 7 dias" value={n('renew7')} sub={brl(paid.filter((u) => sel.renew7(u) && u.status !== 'canceled').reduce((s, u) => s + priceOf(u.planId), 0)) + ' previstos'} />
        <Kpi label="Em atraso (carência)" value={n('past_due')} tone={n('past_due') ? 'warn' : undefined} sub="cobrar antes de expirar" />
        <Kpi label="Cancelados ainda no período" value={n('canceled')} sub="janela para reter" />
        <Kpi label="Cortesias ativas" value={n('courtesy')} sub="não contam em MRR" />
      </div>

      <div className="mb-3">
        <Segmented value={f} onChange={setF} options={[
          { value: 'renew7', label: 'Renovam em 7d', count: n('renew7') }, { value: 'renew30', label: 'Renovam em 30d', count: n('renew30') },
          { value: 'past_due', label: 'Em atraso', count: n('past_due') }, { value: 'canceled', label: 'Cancelados', count: n('canceled') },
          { value: 'courtesy', label: 'Cortesias', count: n('courtesy') }, { value: 'all', label: 'Todos com plano', count: paid.length },
          { value: 'gateway', label: 'Registros do gateway', count: subs.length },
        ]} />
      </div>

      {f !== 'gateway' ? (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-500">
                <tr><th className="px-3 py-2.5 font-medium">Cliente</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Plano</th><th className="px-3 py-2.5 font-medium">Vence / renova</th><th className="px-3 py-2.5 font-medium">Último uso</th><th className="px-3 py-2.5 text-right font-medium">Total pago</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u) => (
                  <tr key={u.uid} onClick={() => go(`users?uid=${u.uid}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="max-w-[260px] px-3 py-2.5"><div className="truncate font-medium">{u.name || u.email}</div><div className="truncate text-xs text-slate-500">{u.email}</div></td>
                    <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-1.5">{u.planId === 'annual' ? 'Anual' : u.planId === 'monthly' ? 'Mensal' : u.planId}<ProviderBadge provider={u.provider} /></div></td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <div>{dateBR(u.periodEnd)}</div>
                      <div className={cx('text-xs', u.periodEnd && u.periodEnd < now ? 'text-rose-600' : 'text-slate-500')}>{rel(u.periodEnd)}{u.graceUntil ? ` · carência até ${dateBR(u.graceUntil)}` : ''}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{rel(u.lastActiveAt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{brl(u.totalPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <Empty title="Nada aqui." />}
          </div>
        </Card>
      ) : billing.loading && !billing.data ? <Loading /> : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-500">
                <tr><th className="px-3 py-2.5 font-medium">E-mail</th><th className="px-3 py-2.5 font-medium">Gateway</th><th className="px-3 py-2.5 font-medium">Status no gateway</th><th className="px-3 py-2.5 font-medium">Início</th><th className="px-3 py-2.5 text-right font-medium">Cobranças</th><th className="px-3 py-2.5 font-medium">Período até</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s.id} className={cx(s.uid && 'cursor-pointer hover:bg-slate-50')} onClick={() => s.uid && go(`users?uid=${s.uid}`)}>
                    <td className="max-w-[240px] truncate px-3 py-2.5">{s.email}{!s.uid && <span className="ml-1.5 text-xs text-rose-600">(sem conta)</span>}</td>
                    <td className="px-3 py-2.5"><ProviderBadge provider={s.provider} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600">{dateBR(s.startedAt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.paymentsCount || 0}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600">{dateBR(s.currentPeriodEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!subs.length && <Empty title="Nenhuma assinatura registrada pelo novo webhook ainda." />}
          </div>
        </Card>
      )}
    </div>
  );
}
