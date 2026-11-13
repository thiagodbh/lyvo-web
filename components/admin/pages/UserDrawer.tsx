import React, { useState } from 'react';
import {
  Gift, CalendarPlus, CalendarClock, Ban, ShieldCheck, ShieldOff, KeyRound, LogOut, Trash2, UserCog, StickyNote, Unlock,
} from 'lucide-react';
import { useApi } from '../ctx';
import type { UserActionName, UserDetail } from '../types';
import {
  brl, Button, Card, CopyButton, cx, dateBR, Drawer, Field, inputCls, Loading, ErrorBox, Modal, Pill,
  ProviderBadge, rel, Segmented, StatusBadge, useAsync, useToast,
} from '../ui';
import { EVENT_LABEL } from './Payments';

type Tab = 'summary' | 'billing' | 'usage' | 'history';

const ACTIONS: { id: UserActionName; label: string; icon: any; danger?: boolean; desc: string }[] = [
  { id: 'grant_access', label: 'Liberar acesso', icon: Gift, desc: 'Concede plano pago (manual) ou cortesia por um período.' },
  { id: 'extend_trial', label: 'Estender trial', icon: CalendarPlus, desc: 'Adiciona dias ao período de teste.' },
  { id: 'set_period_end', label: 'Alterar vencimento', icon: CalendarClock, desc: 'Muda a data em que o acesso pago/cortesia termina.' },
  { id: 'revoke_access', label: 'Revogar acesso', icon: ShieldOff, danger: true, desc: 'Corta o acesso agora (vai para o paywall).' },
  { id: 'block', label: 'Bloquear conta', icon: Ban, danger: true, desc: 'Bloqueia e derruba as sessões. Pagamentos não reativam enquanto bloqueado.' },
  { id: 'unblock', label: 'Desbloquear', icon: Unlock, desc: 'Restaura o acesso que existia antes do bloqueio.' },
  { id: 'password_reset_link', label: 'Link de nova senha', icon: KeyRound, desc: 'Gera um link de redefinição para você enviar ao cliente.' },
  { id: 'revoke_sessions', label: 'Derrubar sessões', icon: LogOut, desc: 'Força o usuário a fazer login de novo em todos os aparelhos.' },
  { id: 'set_admin', label: 'Permissão de admin', icon: UserCog, desc: 'Dá ou remove acesso a este painel.' },
  { id: 'delete_account', label: 'Excluir conta (LGPD)', icon: Trash2, danger: true, desc: 'Apaga login e dados do app. Registros financeiros ficam, pseudonimizados.' },
  { id: 'cancel_gateway_subscription', label: 'Cancelar assinatura na Olimpo Pay', icon: Ban, danger: true, desc: 'Para as próximas cobranças na Olimpo Pay. O cliente mantém acesso até o fim do período já pago.' },
];
const GRID_HIDDEN: UserActionName[] = ['cancel_gateway_subscription'];

export default function UserDrawer({ uid, onClose, onChanged }: { uid: string; onClose: () => void; onChanged: () => void }) {
  const api = useApi();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getUser(uid), [uid, api]);
  const [tab, setTab] = useState<Tab>('summary');
  const [action, setAction] = useState<UserActionName | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const after = () => { reload(); onChanged(); };

  return (
    <Drawer open onClose={onClose}
      title={data ? (data.row.name || data.row.email) : 'Carregando…'}
      subtitle={data ? <span className="flex flex-wrap items-center gap-2">{data.row.email}<StatusBadge status={data.row.status} />{data.row.isAdmin && <Pill>admin</Pill>}</span> : null}>
      {error ? <div className="p-5"><ErrorBox error={error} onRetry={reload} /></div> : loading && !data ? <Loading /> : data && (
        <div className="space-y-4 p-4 sm:p-5">
          <AccessBox d={data} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACTIONS.filter((a) => !GRID_HIDDEN.includes(a.id) && (a.id === 'unblock' ? data.row.blocked : a.id === 'block' ? !data.row.blocked : true)).map((a) => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => setAction(a.id)} title={a.desc}
                  className={cx('flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-xs font-medium ring-1 transition',
                    a.danger ? 'text-rose-700 ring-rose-200 hover:bg-rose-50' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  <Icon className="h-4 w-4 flex-shrink-0" />{a.label}
                </button>
              );
            })}
          </div>

          <Segmented value={tab} onChange={setTab} options={[
            { value: 'summary', label: 'Perfil' },
            { value: 'billing', label: 'Pagamentos', count: data.events.length },
            { value: 'usage', label: 'Uso' },
            { value: 'history', label: 'Notas e auditoria', count: data.notes.length + data.audit.length },
          ]} />

          {tab === 'summary' && <ProfileTab d={data} />}
          {tab === 'billing' && <BillingTab d={data} onCancelSub={(id) => { setSubId(id); setAction('cancel_gateway_subscription'); }} />}
          {tab === 'usage' && <UsageTab d={data} />}
          {tab === 'history' && (
            <div className="space-y-4">
              <Card title="Notas internas">
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="Ex.: pediu reembolso pelo WhatsApp; aguardando…" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button variant="primary" loading={savingNote} disabled={!note.trim()} icon={<StickyNote className="h-4 w-4" />}
                    onClick={async () => {
                      setSavingNote(true);
                      try { await api.userAction(uid, 'note', { text: note }); setNote(''); toast('Nota salva'); after(); }
                      catch (e: any) { toast(e.message, 'err'); } finally { setSavingNote(false); }
                    }}>Salvar</Button>
                </div>
                <ul className="mt-3 space-y-2">
                  {data.notes.map((n, i) => (
                    <li key={i} className="rounded-lg bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
                      <div className="text-slate-800">{n.text}</div>
                      <div className="mt-1 text-xs text-slate-500">{n.by} · {dateBR(n.at, true)}</div>
                    </li>
                  ))}
                  {!data.notes.length && <li className="text-sm text-slate-500">Nenhuma nota.</li>}
                </ul>
              </Card>
              <Card title="Auditoria deste usuário" pad={false}>
                <ul className="divide-y divide-slate-100">
                  {data.audit.map((a) => (
                    <li key={a.id} className="px-4 py-2.5 text-sm">
                      <div className="flex justify-between gap-2"><span className="font-medium text-slate-800">{a.action}</span><span className="text-xs text-slate-500">{dateBR(a.at, true)}</span></div>
                      <div className="text-xs text-slate-500">{a.actorEmail}{a.reason ? ` — “${a.reason}”` : ''}</div>
                    </li>
                  ))}
                  {!data.audit.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma ação administrativa.</li>}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}

      {action && data && (
        <ActionModal action={action} d={data} subscriptionId={subId} onClose={() => { setAction(null); setSubId(null); }}
          onDone={(msg) => { setAction(null); toast(msg); if (action === 'delete_account') { onChanged(); onClose(); } else after(); }} />
      )}
    </Drawer>
  );
}

function AccessBox({ d }: { d: UserDetail }) {
  const r = d.row;
  const trial = r.status === 'trial' || r.status === 'trial_expired';
  const until = trial ? r.trialEndsAt : r.periodEnd;
  return (
    <div className={cx('rounded-xl p-4 ring-1', r.hasAccess ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-slate-100 ring-slate-200')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{r.hasAccess ? 'Com acesso ao app' : 'Sem acesso (vê o paywall)'}</div>
        <div className="flex items-center gap-1.5">{r.provider && <ProviderBadge provider={r.provider} />}</div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Plano</dt><dd className="font-medium">{r.planId === 'annual' ? 'Anual' : r.planId === 'monthly' ? 'Mensal' : r.planId || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">{trial ? 'Trial até' : 'Acesso até'}</dt><dd className="font-medium tabular-nums">{dateBR(until)}</dd><dd className="text-xs text-slate-500">{until ? rel(until) : ''}</dd></div>
        <div><dt className="text-xs text-slate-500">Total pago</dt><dd className="font-medium tabular-nums">{brl(r.totalPaid)}</dd></div>
        <div><dt className="text-xs text-slate-500">Carência até</dt><dd className="font-medium tabular-nums">{dateBR(r.graceUntil)}</dd></div>
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800 break-all">{v || '—'}</span></div>;
}

function ProfileTab({ d }: { d: UserDetail }) {
  const r = d.row;
  const acq = r.acquisition || {};
  const wa = r.phone ? `https://wa.me/55${r.phone.replace(/\D/g, '')}` : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Dados">
        <Row k="Nome" v={r.name} />
        <Row k="E-mail" v={<span className="inline-flex items-center gap-1.5">{r.email}{r.emailVerified ? <Pill tone="green">verificado</Pill> : <Pill>não verificado</Pill>}</span>} />
        <Row k="Telefone" v={r.phone && wa ? <a className="text-teal-700 hover:underline" href={wa} target="_blank" rel="noreferrer">{r.phone}</a> : null} />
        <Row k="Nascimento" v={d.profile.birthDate ? dateBR(Date.parse(d.profile.birthDate + 'T12:00:00')) : null} />
        <Row k="Cidade" v={r.city ? `${r.city} - ${r.state}` : null} />
        <Row k="Profissão" v={r.profession} />
        <Row k="Renda" v={r.income} />
        <Row k="Perfil" v={`${r.profileCompleteness}% preenchido`} />
      </Card>
      <div className="space-y-4">
        <Card title="Conta">
          <Row k="Cadastro" v={dateBR(r.createdAt, true)} />
          <Row k="Último login" v={dateBR(r.lastSignInAt, true)} />
          <Row k="Último uso" v={rel(r.lastActiveAt)} />
          <Row k="Login via" v={r.authProviders.join(', ')} />
          <Row k="Notificações" v={r.pushEnabled ? 'ativadas' : 'desativadas'} />
          <Row k="UID" v={<span className="inline-flex items-center gap-1.5 font-mono text-xs">{r.uid.slice(0, 14)}…<CopyButton text={r.uid} label="UID" /></span>} />
        </Card>
        <Card title="Origem">
          <Row k="Fonte" v={acq.utm_source} />
          <Row k="Campanha" v={acq.utm_campaign} />
          <Row k="Mídia" v={acq.utm_medium} />
          <Row k="Indicado por" v={d.referrals.invitedBy || acq.ref} />
          <Row k="Indicou" v={`${d.referrals.invited} pessoa(s)`} />
        </Card>
      </div>
    </div>
  );
}

function BillingTab({ d, onCancelSub }: { d: UserDetail; onCancelSub: (id: string) => void }) {
  return (
    <div className="space-y-4">
      {d.subscriptions.length > 0 && (
        <Card title="Assinaturas no gateway" pad={false}>
          <ul className="divide-y divide-slate-100">
            {d.subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-2"><ProviderBadge provider={s.provider} /><StatusBadge status={s.status} /></div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 tabular-nums">
                    desde {dateBR(s.startedAt)} · {s.paymentsCount || 0} cobrança(s) · até {dateBR(s.currentPeriodEnd)}
                    {s.nextChargeAt ? ` · próxima ${dateBR(s.nextChargeAt)}` : ''}
                  </div>
                  {s.provider === 'olimpopay' && ['waiting', 'active', 'past_due'].includes(s.status) && (
                    <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => onCancelSub(s.id)}>Cancelar</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="Eventos de pagamento" pad={false}>
        <ul className="divide-y divide-slate-100">
          {d.events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">{EVENT_LABEL[e.type] || e.type}<ProviderBadge provider={e.provider} />{e.isTest && <Pill tone="violet">teste</Pill>}</div>
                <div className="truncate text-xs text-slate-500">{e.rawType} · {dateBR(e.occurredAt, true)}</div>
              </div>
              <div className={cx('text-sm font-semibold tabular-nums', e.revenue > 0 ? 'text-emerald-700' : e.revenue < 0 ? 'text-rose-600' : 'text-slate-400')}>
                {e.revenue ? brl(e.revenue) : e.amount ? brl(e.amount) : '—'}
              </div>
            </li>
          ))}
          {!d.events.length && <li className="px-4 py-8 text-center text-sm text-slate-500">Nenhum pagamento vinculado a este usuário.</li>}
        </ul>
      </Card>
    </div>
  );
}

function UsageTab({ d }: { d: UserDetail }) {
  const labels: Record<string, string> = {
    transactions: 'Lançamentos', fixedBills: 'Contas fixas', creditCards: 'Cartões', forecasts: 'Previsões',
    budgetLimits: 'Limites de categoria', events: 'Eventos de agenda', calendarConnections: 'Agendas conectadas', calendarCategories: 'Categorias de agenda',
  };
  const u = d.row.usage;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(d.counts).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
            <div className="text-xs text-slate-500">{labels[k] || k}</div>
            <div className="text-lg font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Marcos de ativação">
        <Row k="Primeiro lançamento" v={u.firstTxAt ? `${dateBR(u.firstTxAt, true)} (${d.row.createdAt ? Math.max(0, Math.round((u.firstTxAt - d.row.createdAt) / 60000)) : '?'} min após cadastro)` : 'nunca'} />
        <Row k="Último lançamento" v={rel(u.lastTxAt)} />
        <Row k="Google Agenda" v={u.googleConnected ? 'conectado' : 'não conectado'} />
      </Card>
      <p className="text-xs text-slate-500">Os contadores acima são lidos ao vivo. Os da lista de usuários vêm de gatilhos (use “Recalcular uso” na Auditoria para dados antigos).</p>
    </div>
  );
}

function ActionModal({ action, d, subscriptionId, onClose, onDone }: { action: UserActionName; d: UserDetail; subscriptionId?: string | null; onClose: () => void; onDone: (msg: string) => void }) {
  const api = useApi();
  const meta = ACTIONS.find((a) => a.id === action)!;
  const [reason, setReason] = useState('');
  const [planId, setPlanId] = useState(d.row.planId || 'annual');
  const [kind, setKind] = useState<'courtesy' | 'paid'>('courtesy');
  const [days, setDays] = useState(action === 'extend_trial' ? 7 : 30);
  const [until, setUntil] = useState(() => new Date((d.row.periodEnd || Date.now() + 30 * 864e5) - 3 * 3600e3).toISOString().slice(0, 10));
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const needsReason = !['password_reset_link'].includes(action);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const p: Record<string, any> = { reason };
      if (action === 'grant_access') Object.assign(p, { planId, kind, days });
      if (action === 'extend_trial') p.days = days;
      if (action === 'set_period_end') p.until = new Date(until + 'T23:59:00-03:00').getTime();
      if (action === 'set_admin') p.value = !d.row.isAdmin;
      if (action === 'delete_account') p.confirmEmail = confirmEmail;
      if (action === 'cancel_gateway_subscription') p.subscriptionId = subscriptionId;
      const r = await api.userAction(d.row.uid, action, p);
      if (action === 'password_reset_link' && r?.link) { setLink(r.link); setBusy(false); return; }
      onDone(`${meta.label}: feito`);
    } catch (e: any) { setErr(e?.message || String(e)); setBusy(false); }
  };

  const disabled = (needsReason && reason.trim().length < 3) || (action === 'delete_account' && confirmEmail.toLowerCase() !== d.row.email.toLowerCase());

  return (
    <Modal open onClose={onClose} title={action === 'set_admin' ? (d.row.isAdmin ? 'Remover admin' : 'Tornar admin') : meta.label}
      footer={link ? <Button onClick={onClose}>Fechar</Button> : <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant={meta.danger ? 'danger' : 'primary'} loading={busy} disabled={disabled} onClick={submit}>Confirmar</Button>
      </>}>
      <p className="mb-4 text-sm text-slate-600">{meta.desc}</p>
      <div className="space-y-3">
        {action === 'grant_access' && (<>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plano"><select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="annual">Anual</option><option value="monthly">Mensal</option></select></Field>
            <Field label="Duração (dias)"><input type="number" min={1} max={3650} className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
          </div>
          <Field label="Tipo" hint="Cortesia não entra em MRR. “Pago manual” é para quem pagou por fora (Pix direto etc.).">
            <Segmented value={kind} onChange={setKind} options={[{ value: 'courtesy', label: 'Cortesia' }, { value: 'paid', label: 'Pago manual' }]} />
          </Field>
        </>)}
        {action === 'extend_trial' && <Field label="Dias a adicionar"><input type="number" min={1} max={90} className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>}
        {action === 'set_period_end' && <Field label="Novo vencimento"><input type="date" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} /></Field>}
        {action === 'delete_account' && (
          <Field label={`Digite ${d.row.email} para confirmar`} hint="Irreversível. Login, lançamentos, agenda e cartões são apagados.">
            <input className={inputCls} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          </Field>
        )}
        {needsReason && (
          <Field label="Motivo (obrigatório — vai para a auditoria)">
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: pagou via Pix direto em 12/11" />
          </Field>
        )}
        {link && (
          <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
            <div className="mb-2 text-sm font-medium text-emerald-900">Link gerado. Envie para o cliente:</div>
            <div className="mb-2 break-all rounded bg-white p-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{link}</div>
            <CopyButton text={link} label="Copiar link" />
          </div>
        )}
        {action === 'set_admin' && <div className="flex items-center gap-2 text-sm text-slate-600">{d.row.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{d.row.isAdmin ? 'Remove o acesso deste usuário ao painel.' : 'Este usuário poderá ver e alterar tudo neste painel.'}</div>}
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      </div>
    </Modal>
  );
}
