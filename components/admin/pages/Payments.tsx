import { useEffect, useMemo, useState } from 'react';
import { Download, Link2, Search, FileJson } from 'lucide-react';
import { useApi, useRoute, go } from '../ctx';
import type { BillingEvent, CanonicalType, UserRow } from '../types';
import {
  brl, Button, Card, cx, dateBR, downloadCsv, Empty, ErrorBox, Field, inputCls, Kpi, Loading, Modal, PageHeader,
  Pill, ProviderBadge, Segmented, useAsync, useToast,
} from '../ui';

export const EVENT_LABEL: Record<CanonicalType, string> = {
  PAYMENT_APPROVED: 'Compra aprovada', PAYMENT_RENEWED: 'Renovação paga', PAYMENT_PENDING: 'Aguardando pagamento',
  PAYMENT_FAILED: 'Pagamento falhou', RENEWAL_LATE: 'Renovação em atraso', SUBSCRIPTION_CANCELED: 'Assinatura cancelada',
  SUBSCRIPTION_EXPIRED: 'Assinatura expirada', REFUNDED: 'Reembolso', CHARGEBACK: 'Chargeback', IGNORED: 'Ignorado',
};
const RESULT: Record<string, { label: string; tone: any }> = {
  applied: { label: 'aplicado', tone: 'green' }, pending_user: { label: 'sem conta', tone: 'red' }, no_change: { label: 'sem efeito', tone: 'slate' },
  duplicate: { label: 'duplicado', tone: 'slate' }, test: { label: 'teste', tone: 'violet' }, unmatched_plan: { label: 'plano?', tone: 'amber' }, error: { label: 'erro', tone: 'red' },
};

type F = 'all' | 'money' | 'refunds' | 'unmatched' | 'noplan' | 'test' | 'legacy';

export default function PaymentsPage() {
  const api = useApi();
  const { params } = useRoute();
  const { data, error, loading, reload } = useAsync(() => api.listBilling(), [api]);
  const [f, setF] = useState<F>((params.get('filter') as F) || 'all');
  const [prov, setProv] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<BillingEvent | null>(null);
  useEffect(() => { const x = params.get('filter'); if (x) setF(x as F); }, [params]);

  const events = data?.events || [];
  const test = (e: BillingEvent, k: F) => {
    switch (k) {
      case 'money': return e.revenue > 0;
      case 'refunds': return e.revenue < 0;
      case 'unmatched': return !e.matched && !e.isTest && ['PAYMENT_APPROVED', 'PAYMENT_RENEWED'].includes(e.type);
      case 'noplan': return e.result === 'unmatched_plan';
      case 'test': return e.isTest;
      case 'legacy': return e.endpoint === 'legacy';
      default: return true;
    }
  };
  const count = (k: F) => events.filter((e) => test(e, k)).length;
  const rows = useMemo(() => events
    .filter((e) => test(e, f))
    .filter((e) => prov === 'all' || e.provider === prov)
    .filter((e) => !q.trim() || [e.email, e.name, e.rawType, e.externalPaymentId, e.id].some((x) => x && x.toLowerCase().includes(q.trim().toLowerCase()))),
  [events, f, prov, q]);

  const d30 = events.filter((e) => !e.isTest && e.occurredAt && Date.now() - e.occurredAt < 30 * 864e5);

  return (
    <div>
      <PageHeader title="Pagamentos" desc="Todo evento recebido de qualquer gateway, com o efeito que teve no acesso."
        actions={<Button icon={<Download className="h-4 w-4" />} disabled={!rows.length} onClick={() => downloadCsv(`lyvo-pagamentos-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((e) => ({
          data: dateBR(e.occurredAt, true), gateway: e.provider, evento: e.rawType, tipo: EVENT_LABEL[e.type], email: e.email || '', plano: e.planId || '',
          valor: (e.amount ?? '').toString().replace('.', ','), receita: e.revenue.toFixed(2).replace('.', ','), metodo: e.paymentMethod || '',
          resultado: RESULT[e.result]?.label || e.result, id_pagamento: e.externalPaymentId || '', teste: e.isTest ? 'sim' : '',
        })))}>Exportar CSV</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Receita 30d" value={brl(d30.filter((e) => e.revenue > 0).reduce((s, e) => s + e.revenue, 0))} sub={`${d30.filter((e) => e.revenue > 0).length} pagamentos`} />
        <Kpi label="Reembolsos/chargebacks 30d" value={brl(-d30.filter((e) => e.revenue < 0).reduce((s, e) => s + e.revenue, 0))} sub={`${d30.filter((e) => e.revenue < 0).length} eventos`} tone={d30.some((e) => e.revenue < 0) ? 'down' : undefined} />
        <Kpi label="Pagamentos sem conta" value={count('unmatched')} sub="precisam ser vinculados" tone={count('unmatched') ? 'warn' : undefined} />
        <Kpi label="Sem plano identificado" value={count('noplan')} sub="mapear ID no plano" tone={count('noplan') ? 'warn' : undefined} />
      </div>

      <div className="mb-3 space-y-3">
        <Segmented value={f} onChange={setF} options={[
          { value: 'all', label: 'Todos', count: events.length }, { value: 'money', label: 'Entradas', count: count('money') },
          { value: 'refunds', label: 'Reembolsos', count: count('refunds') }, { value: 'unmatched', label: 'Sem conta', count: count('unmatched') },
          { value: 'noplan', label: 'Sem plano', count: count('noplan') }, { value: 'legacy', label: 'Webhook antigo', count: count('legacy') },
          { value: 'test', label: 'Testes', count: count('test') },
        ]} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={cx(inputCls, 'pl-9')} placeholder="Buscar por e-mail, nome, ID do pagamento…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={cx(inputCls, 'sm:w-44')} value={prov} onChange={(e) => setProv(e.target.value)}>
            <option value="all">Todos gateways</option><option value="lastlink">LastLink</option><option value="kiwify">Kiwify</option><option value="hotmart">Hotmart</option><option value="cakto">Cakto</option>
          </select>
        </div>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-500">
                <tr><th className="px-3 py-2.5 font-medium">Data</th><th className="px-3 py-2.5 font-medium">Evento</th><th className="px-3 py-2.5 font-medium">Cliente</th><th className="px-3 py-2.5 font-medium">Plano</th><th className="px-3 py-2.5 text-right font-medium">Valor</th><th className="px-3 py-2.5 font-medium">Resultado</th><th className="px-3 py-2.5" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 400).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">{dateBR(e.occurredAt, true)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">{EVENT_LABEL[e.type] || e.type}{e.endpoint === 'legacy' && <Pill tone="amber">legado</Pill>}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500"><ProviderBadge provider={e.provider} /><span className="truncate">{e.rawType}</span></div>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      {e.uid ? <button className="truncate text-left text-teal-700 hover:underline" onClick={() => go(`users?uid=${e.uid}`)}>{e.email}</button> : <span className="truncate text-slate-700">{e.email || '—'}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{e.planId === 'annual' ? 'Anual' : e.planId === 'monthly' ? 'Mensal' : e.planId || '—'}</td>
                    <td className={cx('px-3 py-2.5 text-right font-medium tabular-nums', e.revenue > 0 ? 'text-emerald-700' : e.revenue < 0 ? 'text-rose-600' : 'text-slate-400')}>
                      {e.revenue ? brl(e.revenue) : e.amount ? brl(e.amount) : '—'}
                    </td>
                    <td className="px-3 py-2.5"><Pill tone={RESULT[e.result]?.tone || 'slate'}>{RESULT[e.result]?.label || e.result}</Pill></td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant={!e.matched && !e.isTest && e.revenue > 0 ? 'primary' : 'ghost'} onClick={() => setOpen(e)}
                        icon={!e.matched && !e.isTest && e.revenue > 0 ? <Link2 className="h-3.5 w-3.5" /> : <FileJson className="h-3.5 w-3.5" />}>
                        {!e.matched && !e.isTest && e.revenue > 0 ? 'Vincular' : 'Detalhes'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <Empty title="Nenhum evento." desc="Quando os gateways enviarem webhooks, eles aparecem aqui." />}
            {rows.length > 400 && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Mostrando 400 de {rows.length}. Use os filtros ou exporte o CSV.</div>}
          </div>
        </Card>
      )}

      {open && <EventModal ev={open} onClose={() => setOpen(null)} onLinked={() => { setOpen(null); reload(); }} />}
    </div>
  );
}

function EventModal({ ev, onClose, onLinked }: { ev: BillingEvent; onClose: () => void; onLinked: () => void }) {
  const api = useApi();
  const toast = useToast();
  const raw = useAsync(() => api.getEventRaw(ev.id), [ev.id]);
  const users = useAsync<UserRow[]>(() => (ev.matched ? Promise.resolve([]) : api.listUsers()), [ev.id]);
  const [q, setQ] = useState(ev.email?.split('@')[0] || '');
  const [uid, setUid] = useState('');
  const [planId, setPlanId] = useState(ev.planId || 'monthly');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const candidates = (users.data || []).filter((u) => q.trim().length >= 2 && [u.email, u.name, u.phone].some((x) => x?.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 8);
  const canLink = !ev.matched && !ev.isTest;

  let pretty = '';
  try { pretty = raw.data?.rawJson ? JSON.stringify(JSON.parse(raw.data.rawJson), null, 2) : ''; } catch { pretty = raw.data?.rawJson || ''; }

  return (
    <Modal open onClose={onClose} wide title={`${EVENT_LABEL[ev.type]} · ${ev.rawType}`}
      footer={canLink ? <>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button variant="primary" disabled={!uid || reason.trim().length < 3} loading={busy} icon={<Link2 className="h-4 w-4" />}
          onClick={async () => {
            setBusy(true);
            try { await api.linkEvent(ev.id, uid, planId, reason); toast('Pagamento vinculado e acesso liberado'); onLinked(); }
            catch (e: any) { toast(e.message, 'err'); setBusy(false); }
          }}>Vincular e liberar acesso</Button>
      </> : <Button onClick={onClose}>Fechar</Button>}>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Gateway</dt><dd><ProviderBadge provider={ev.provider} /></dd></div>
        <div><dt className="text-xs text-slate-500">E-mail no pagamento</dt><dd className="break-all font-medium">{ev.email || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Valor</dt><dd className="font-medium tabular-nums">{brl(ev.amount)}</dd></div>
        <div><dt className="text-xs text-slate-500">Recebido</dt><dd className="tabular-nums">{dateBR(ev.receivedAt, true)}</dd></div>
      </dl>

      {canLink && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div className="mb-3 text-sm font-medium text-amber-900">Este pagamento não achou conta com o mesmo e-mail. Escolha a conta certa:</div>
          <div className="space-y-3">
            <input className={inputCls} placeholder="Buscar conta por e-mail, nome ou telefone" value={q} onChange={(e) => { setQ(e.target.value); setUid(''); }} />
            <ul className="max-h-48 divide-y divide-amber-100 overflow-y-auto rounded-lg bg-white ring-1 ring-amber-200">
              {candidates.map((u) => (
                <li key={u.uid}>
                  <button onClick={() => setUid(u.uid)} className={cx('flex w-full justify-between gap-2 px-3 py-2 text-left text-sm', uid === u.uid ? 'bg-teal-50' : 'hover:bg-slate-50')}>
                    <span className="truncate"><span className="font-medium">{u.name || '(sem nome)'}</span> <span className="text-slate-500">{u.email}</span></span>
                    {uid === u.uid && <span className="text-xs font-semibold text-teal-700">selecionado</span>}
                  </button>
                </li>
              ))}
              {q.trim().length >= 2 && !candidates.length && <li className="px-3 py-3 text-sm text-slate-500">Nenhuma conta encontrada.</li>}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plano"><select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="annual">Anual</option><option value="monthly">Mensal</option></select></Field>
              <Field label="Motivo (auditoria)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: pagou com e-mail do trabalho" /></Field>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs font-medium text-slate-500">Payload recebido do gateway</div>
      {raw.loading ? <Loading /> : (
        <pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">{pretty || '(sem payload guardado)'}</pre>
      )}
    </Modal>
  );
}
