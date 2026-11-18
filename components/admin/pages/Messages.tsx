import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Copy, ExternalLink, UserRound, Save, RotateCcw, Settings2, ListChecks, FileText, History,
  PhoneOff, BellOff, ShieldCheck, Zap, Hand, CheckCircle2, SkipForward,
} from 'lucide-react';
import { useApi, useRoute, go } from '../ctx';
import type { UserRow } from '../types';
import {
  Button, Card, cx, dateBR, Empty, ErrorBox, Field, inputCls, Kpi, Loading, Modal, PageHeader, Pill, rel,
  Segmented, StatusBadge, Toggle, useAsync, useToast, pct,
} from '../ui';
import {
  DEFAULT_TEMPLATES, MessagingConfig, MessageLogEntry, PHASE_STYLE, QueueItem, STAGES, STAGE_BY_ID, StageId,
  VARIABLES, buildQueue, buildVars, mergeMessaging, phoneDigits, render, stageConversion,
} from '../messaging/funnel';
import { copyText, Initials, StageChip, WhatsAppBubble } from '../messaging/parts';

type Tab = 'queue' | 'templates' | 'history' | 'settings';

export default function MessagesPage() {
  const api = useApi();
  const { params } = useRoute();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'queue');
  useEffect(() => { const t = params.get('tab') as Tab | null; if (t) setTab(t); }, [params]);
  const users = useAsync(() => api.listUsers(), [api]);
  const billing = useAsync(() => api.listBilling(), [api]);
  const cfg = useAsync(() => api.getConfig(), [api]);
  const msgCfg = useAsync(() => api.getMessaging(), [api]);
  const log = useAsync<MessageLogEntry[]>(() => api.listMessageLog(), [api]);
  const [localLog, setLocalLog] = useState<MessageLogEntry[]>([]);
  useEffect(() => { setLocalLog([]); }, [log.data]);

  const messaging = useMemo(() => mergeMessaging(msgCfg.data), [msgCfg.data]);
  const fullLog = useMemo(() => [...localLog, ...(log.data || [])], [localLog, log.data]);
  const now = Date.now();
  const queue = useMemo(() => (users.data && billing.data
    ? buildQueue(users.data, billing.data.subscriptions, billing.data.events, fullLog, { now, cfg: cfg.data || null, messaging })
    : null), [users.data, billing.data, fullLog, cfg.data, messaging]);

  const err = users.error || billing.error || msgCfg.error || log.error;
  if (err) return <ErrorBox error={err} onRetry={() => { users.reload(); billing.reload(); msgCfg.reload(); log.reload(); }} />;
  if (!queue || !log.data || msgCfg.loading) return <Loading />;

  const sent7 = fullLog.filter((l) => l.at && now - l.at < 7 * 864e5).length;
  const conv = stageConversion(fullLog, billing.data!.events);
  const convTotal = Object.values(conv).reduce((a, v) => ({ sent: a.sent + v.sent, converted: a.converted + v.converted }), { sent: 0, converted: 0 });
  const ready = queue.due.filter((q) => !q.blockedBy).length;

  const record = async (item: { user: UserRow; stage: StageId; templateId: string; text: string }) => {
    const r = await api.logMessage({ uid: item.user.uid, stage: item.stage, templateId: item.templateId, preview: item.text.slice(0, 300) });
    setLocalLog((l) => [{ id: r.id, uid: item.user.uid, email: item.user.email, name: item.user.name, stage: item.stage, templateId: item.templateId, channel: 'whatsapp_manual', preview: item.text.slice(0, 300), by: 'você', at: Date.now() }, ...l]);
  };

  return (
    <div>
      <PageHeader title="Mensagens" desc="Quem abordar hoje, em que momento do funil e com qual mensagem. Um clique abre o WhatsApp com tudo preenchido." />

      {!messaging.senderNumber && (
        <button onClick={() => setTab('settings')} className="mb-4 flex w-full items-center gap-3 rounded-xl bg-amber-50 p-3.5 text-left ring-1 ring-amber-200 hover:brightness-[0.98]">
          <Settings2 className="h-4 w-4 flex-shrink-0 text-amber-700" />
          <div className="text-sm text-amber-900"><strong>Cadastre o WhatsApp do Lyvo.</strong> Assim o painel mostra de qual número as mensagens devem sair e assina com o seu nome.</div>
        </button>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Para enviar hoje" value={ready} sub={`${queue.due.length - ready} bloqueados (sem celular ou sem permissão)`} />
        <Kpi label="Enviadas em 7 dias" value={sent7} sub={`${fullLog.length} no total`} />
        <Kpi label="Pagaram após a mensagem" value={pct(convTotal.sent ? convTotal.converted / convTotal.sent : null)} sub={`${convTotal.converted} de ${convTotal.sent} em até 7 dias`} />
        <Kpi label="Já contatados (aguardando)" value={queue.contacted.length} sub="dentro do intervalo sem repetir" />
      </div>

      <div className="mb-4">
        <Segmented value={tab} onChange={(t) => { setTab(t); go(`messages?tab=${t}`); }} options={[
          { value: 'queue', label: 'Fila de hoje', count: ready },
          { value: 'templates', label: 'Modelos', count: messaging.templates.length },
          { value: 'history', label: 'Histórico', count: fullLog.length },
          { value: 'settings', label: 'Configurar WhatsApp' },
        ]} />
      </div>

      {tab === 'queue' && <QueueTab queue={queue} messaging={messaging} onSent={record} cfg={cfg.data || null} />}
      {tab === 'templates' && <TemplatesTab messaging={messaging} users={users.data!} cfg={cfg.data || null} onSaved={msgCfg.reload} />}
      {tab === 'history' && <HistoryTab log={fullLog} conv={conv} />}
      {tab === 'settings' && <SettingsTab messaging={messaging} onSaved={msgCfg.reload} />}
    </div>
  );
}

// ─── Fila de hoje ───────────────────────────────────────────────────────────
function QueueTab({ queue, messaging, onSent, cfg }: {
  queue: { due: QueueItem[]; contacted: QueueItem[] }; messaging: MessagingConfig; cfg: any;
  onSent: (i: { user: UserRow; stage: StageId; templateId: string; text: string }) => Promise<void>;
}) {
  const toast = useToast();
  const [stage, setStage] = useState<StageId | 'all'>('all');
  const [group, setGroup] = useState<'ready' | 'blocked' | 'contacted'>('ready');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});

  const groups = {
    ready: queue.due.filter((q) => !q.blockedBy),
    blocked: queue.due.filter((q) => q.blockedBy),
    contacted: queue.contacted,
  };
  const showContacted = group === 'contacted';
  const base = groups[group].filter((q) => !skipped.has(q.user.uid));
  const list = base.filter((q) => stage === 'all' || q.stage.id === stage);
  const countBy = (id: StageId) => base.filter((q) => q.stage.id === id).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card pad={false} className="h-fit lg:sticky lg:top-4">
        <div className="border-b border-slate-100 p-3">
          <Segmented value={group} onChange={setGroup} options={[
            { value: 'ready', label: 'A enviar', count: groups.ready.filter((q) => !skipped.has(q.user.uid)).length },
            { value: 'blocked', label: 'Bloqueados', count: groups.blocked.length },
            { value: 'contacted', label: 'Feitos', count: groups.contacted.length },
          ]} />
        </div>
        <ul className="p-2">
          <li>
            <button onClick={() => setStage('all')} className={cx('flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm', stage === 'all' ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50')}>
              Todas as etapas<span className="tabular-nums text-slate-500">{base.length}</span>
            </button>
          </li>
          {(['Conversão', 'Recuperação', 'Ativação', 'Retenção', 'Expansão'] as const).map((phase) => (
            <li key={phase} className="mt-2">
              <div className="flex items-center gap-1.5 px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span className={cx('h-1.5 w-1.5 rounded-full', PHASE_STYLE[phase].dot)} />{phase}
              </div>
              {STAGES.filter((s) => s.phase === phase).map((s) => {
                const n = countBy(s.id);
                return (
                  <button key={s.id} onClick={() => setStage(s.id)} title={s.rule}
                    className={cx('flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm', stage === s.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50', !n && 'text-slate-400')}>
                    <span className="truncate">{s.label}</span><span className="tabular-nums">{n || ''}</span>
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0 space-y-3">
        {stage !== 'all' && (
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2"><StageChip stage={STAGE_BY_ID[stage]} />{STAGE_BY_ID[stage].transactional ? <Pill tone="blue">sobre a conta do cliente</Pill> : <Pill>marketing</Pill>}</div>
            <div className="mt-2 text-sm text-slate-700"><strong>Objetivo:</strong> {STAGE_BY_ID[stage].goal}.</div>
            <div className="mt-0.5 text-xs text-slate-500">Quem entra: {STAGE_BY_ID[stage].rule}.</div>
          </div>
        )}

        {list.map((q) => {
          const text = edited[q.user.uid] ?? q.text;
          const link = q.template ? (q.link && edited[q.user.uid] === undefined ? q.link : (phoneDigits(q.user.phone) ? `https://wa.me/${phoneDigits(q.user.phone)}?text=${encodeURIComponent(text)}` : null)) : null;
          const isOpen = open === q.user.uid;
          return (
            <Card key={q.user.uid} pad={false}>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <Initials name={q.user.name} email={q.user.email} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{q.user.name || q.user.email}</span>
                    <StageChip stage={q.stage} />
                    <StatusBadge status={q.user.status} />
                    {q.user.whatsappOptIn && <Pill tone="green">aceitou WhatsApp</Pill>}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{q.reason}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {q.user.phone || 'sem celular'} · último uso {rel(q.user.lastActiveAt)}
                    {q.lastSameStageAt ? ` · mensagem desta etapa ${rel(q.lastSameStageAt)}` : q.user.lastContactAt ? ` · último contato ${rel(q.user.lastContactAt)}` : ''}
                  </div>
                  {q.blockedBy && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {q.blockedBy === 'no_phone' ? <><PhoneOff className="h-3.5 w-3.5" />Sem celular válido no cadastro</>
                        : q.blockedBy === 'opt_out' ? <><BellOff className="h-3.5 w-3.5" />Pediu para não receber mensagens</>
                        : <><ShieldCheck className="h-3.5 w-3.5" />Não aceitou mensagens de marketing</>}
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  {link && !q.blockedBy ? (
                    <a href={link} target="_blank" rel="noreferrer"
                      onClick={async () => {
                        try { await onSent({ user: q.user, stage: q.stage.id, templateId: q.template!.id, text }); toast(`Registrado: ${q.stage.label} para ${q.user.name || q.user.email}`); }
                        catch (e: any) { toast(e.message, 'err'); }
                      }}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1fa855] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a9049]">
                      <MessageCircle className="h-4 w-4" />Enviar<ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </a>
                  ) : null}
                  <Button size="sm" onClick={() => setOpen(isOpen ? null : q.user.uid)}>{isOpen ? 'Fechar' : 'Ver e editar'}</Button>
                  <Button size="sm" variant="ghost" icon={<UserRound className="h-3.5 w-3.5" />} onClick={() => go(`users?uid=${q.user.uid}`)}>Ficha</Button>
                  {!showContacted && <Button size="sm" variant="ghost" icon={<SkipForward className="h-3.5 w-3.5" />} onClick={() => setSkipped(new Set([...skipped, q.user.uid]))}>Pular hoje</Button>}
                </div>
              </div>
              {isOpen && (
                <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span>Texto (ajuste só para esta pessoa)</span>
                      {edited[q.user.uid] !== undefined && <button className="font-medium text-teal-700" onClick={() => { const e = { ...edited }; delete e[q.user.uid]; setEdited(e); }}>Voltar ao modelo</button>}
                    </div>
                    <textarea rows={12} className={cx(inputCls, 'text-[13px] leading-relaxed')} value={text} onChange={(e) => setEdited({ ...edited, [q.user.uid]: e.target.value })} />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={async () => toast((await copyText(text)) ? 'Texto copiado' : 'Selecione e copie manualmente')}>Copiar</Button>
                    </div>
                    {q.missing.length > 0 && <div className="mt-2 text-xs text-amber-700">Sem dado para: {q.missing.map((m) => `{${m}}`).join(', ')}</div>}
                  </div>
                  <WhatsAppBubble text={text} />
                </div>
              )}
            </Card>
          );
        })}
        {!list.length && (
          <Card><Empty title={group === 'contacted' ? 'Ninguém contatado nesta etapa ainda.' : group === 'blocked' ? 'Ninguém bloqueado nesta etapa.' : 'Fila zerada nesta etapa.'}
            desc={group === 'ready' ? 'Quando alguém entrar num momento do funil, aparece aqui com a mensagem pronta.' : group === 'blocked' ? 'Aqui ficam clientes sem celular válido, que pediram para não receber ou sem consentimento de marketing.' : undefined} /></Card>
        )}
      </div>
    </div>
  );
}

// ─── Modelos ────────────────────────────────────────────────────────────────
function TemplatesTab({ messaging, users, cfg, onSaved }: { messaging: MessagingConfig; users: UserRow[]; cfg: any; onSaved: () => void }) {
  const api = useApi();
  const toast = useToast();
  const [tpls, setTpls] = useState(() => JSON.parse(JSON.stringify(messaging.templates)) as MessagingConfig['templates']);
  const [sel, setSel] = useState(tpls[0]?.id);
  const [ask, setAsk] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const t = tpls.find((x) => x.id === sel)!;
  const dirty = JSON.stringify(tpls) !== JSON.stringify(messaging.templates);

  // prévia com um cliente real que esteja nessa etapa (ou um exemplo)
  const sample = useMemo<UserRow>(() => {
    const withName = users.filter((u) => u.name && u.phone);
    const pick = withName.find((u) => (t.stage === 'referral' || t.stage === 'renewal_soon' || t.stage === 'inactive_paying' ? u.status === 'active' : t.stage === 'trial_expired' || t.stage === 'winback' ? u.status === 'trial_expired' : u.status === 'trial')) || withName[0] || users[0];
    return pick;
  }, [users, t.stage]);
  const vars = sample ? buildVars(sample, { now: Date.now(), cfg, messaging, waitingSub: t.stage === 'checkout_abandoned' ? { paymentLink: 'https://go.olimpopay.com.br/link/…', planId: 'annual' } as any : null }) : {};
  const preview = render(t.body, vars);

  const update = (patch: Partial<MessagingConfig['templates'][number]>) => setTpls(tpls.map((x) => (x.id === sel ? { ...x, ...patch } : x)));
  const insert = (key: string) => {
    const el = ta.current; const token = `{${key}}`;
    if (!el) { update({ body: t.body + token }); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    update({ body: t.body.slice(0, s) + token + t.body.slice(e) });
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length; });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card pad={false} className="h-fit">
        <ul className="divide-y divide-slate-100">
          {STAGES.map((s) => {
            const x = tpls.find((y) => y.stage === s.id);
            if (!x) return null;
            return (
              <li key={s.id}>
                <button onClick={() => setSel(x.id)} className={cx('w-full px-3.5 py-2.5 text-left', sel === x.id ? 'bg-slate-50' : 'hover:bg-slate-50')}>
                  <div className="flex items-center gap-2"><span className={cx('h-1.5 w-1.5 rounded-full', PHASE_STYLE[s.phase].dot)} /><span className={cx('text-sm', sel === x.id ? 'font-semibold' : 'text-slate-700')}>{s.label}</span>{!x.active && <Pill>pausado</Pill>}</div>
                  <div className="mt-0.5 truncate pl-3.5 text-xs text-slate-500">{x.name}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={<span className="flex flex-wrap items-center gap-2"><StageChip stage={STAGE_BY_ID[t.stage]} /><span className="font-normal text-slate-500">{STAGE_BY_ID[t.stage].goal}</span></span>}
        action={<Button variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} disabled={!dirty} onClick={() => setAsk(true)}>Salvar modelos</Button>}>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Nome do modelo"><input className={inputCls} value={t.name} onChange={(e) => update({ name: e.target.value })} /></Field>
              <div className="pb-2"><Toggle checked={t.active} onChange={(v) => update({ active: v })} label="Ativo na fila" /></div>
            </div>
            <Field label="Texto" hint="*negrito*  _itálico_  ·  as variáveis entre chaves viram os dados de cada cliente">
              <textarea ref={ta} rows={14} className={cx(inputCls, 'text-[13px] leading-relaxed')} value={t.body} onChange={(e) => update({ body: e.target.value })} />
            </Field>
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-700">Inserir variável</div>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button key={v.key} title={v.label} onClick={() => insert(v.key)}
                    className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-teal-50 hover:text-teal-800 hover:ring-teal-200">{`{${v.key}}`}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t.body.length} caracteres</span>
              <button className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900" onClick={() => {
                const d = DEFAULT_TEMPLATES.find((x) => x.stage === t.stage); if (d) update({ body: d.body, name: d.name });
              }}><RotateCcw className="h-3.5 w-3.5" />Restaurar texto padrão</button>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-xs text-slate-500">Prévia com dados de {sample?.name || 'um cliente'}</div>
            <WhatsAppBubble text={preview} />
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
              <strong className="text-slate-800">Quem recebe:</strong> {STAGE_BY_ID[t.stage].rule}.<br />
              <strong className="text-slate-800">Não repete antes de:</strong> {STAGE_BY_ID[t.stage].cooldownDays ?? messaging.dedupDays} dias para a mesma pessoa.
            </div>
          </div>
        </div>
      </Card>

      <Modal open={ask} onClose={() => setAsk(false)} title="Salvar modelos"
        footer={<><Button variant="ghost" onClick={() => setAsk(false)}>Cancelar</Button>
          <Button variant="primary" loading={saving} disabled={reason.trim().length < 3} onClick={async () => {
            setSaving(true);
            try { await api.saveMessaging({ ...messaging, templates: tpls }, reason); toast('Modelos salvos'); setAsk(false); setReason(''); onSaved(); }
            catch (e: any) { toast(e.message, 'err'); } finally { setSaving(false); }
          }}>Salvar</Button></>}>
        <p className="mb-3 text-sm text-slate-600">A fila passa a usar os novos textos na hora.</p>
        <Field label="O que mudou (auditoria)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: texto de teste acabando mais direto" /></Field>
      </Modal>
    </div>
  );
}

// ─── Histórico ──────────────────────────────────────────────────────────────
function HistoryTab({ log, conv }: { log: MessageLogEntry[]; conv: Record<string, { sent: number; converted: number }> }) {
  const [q, setQ] = useState('');
  const rows = log.filter((l) => !q.trim() || [l.name, l.email, STAGE_BY_ID[l.stage as StageId]?.label].some((x) => x && x.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div className="space-y-4">
      <Card title="Resultado por etapa" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-4 py-2 font-medium">Etapa</th><th className="px-4 py-2 text-right font-medium">Enviadas</th><th className="px-4 py-2 text-right font-medium">Pagaram em 7 dias</th><th className="px-4 py-2 text-right font-medium">Conversão</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {STAGES.filter((s) => conv[s.id]).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2"><StageChip stage={s} /></td>
                  <td className="px-4 py-2 text-right tabular-nums">{conv[s.id].sent}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{conv[s.id].converted}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{pct(conv[s.id].sent ? conv[s.id].converted / conv[s.id].sent : null, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!Object.keys(conv).length && <Empty title="Nenhuma mensagem enviada ainda." />}
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Conta como conversão quem teve pagamento confirmado até 7 dias depois da mensagem. Mostra correlação, não prova que foi a mensagem.</p>
      </Card>
      <input className={inputCls} placeholder="Buscar por nome, e-mail ou etapa…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card pad={false}>
        <ul className="divide-y divide-slate-100">
          {rows.slice(0, 300).map((l) => (
            <li key={l.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button className="font-medium text-slate-900 hover:underline" onClick={() => go(`users?uid=${l.uid}`)}>{l.name || l.email}</button>
                  {STAGE_BY_ID[l.stage as StageId] && <StageChip stage={STAGE_BY_ID[l.stage as StageId]} />}
                </div>
                {l.preview && <div className="mt-0.5 truncate text-xs text-slate-500">{l.preview.replace(/\n+/g, ' ')}</div>}
              </div>
              <div className="flex-shrink-0 text-xs tabular-nums text-slate-500">{dateBR(l.at, true)} · {l.by}</div>
            </li>
          ))}
        </ul>
        {!rows.length && <Empty title="Sem registros." />}
      </Card>
    </div>
  );
}

// ─── Configurar ─────────────────────────────────────────────────────────────
function SettingsTab({ messaging, onSaved }: { messaging: MessagingConfig; onSaved: () => void }) {
  const api = useApi();
  const toast = useToast();
  const [c, setC] = useState(messaging);
  const [saving, setSaving] = useState(false);
  const num = c.senderNumber.replace(/\D/g, '');
  const valid = !num || /^55\d{10,11}$/.test(num);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="WhatsApp do Lyvo">
        <div className="space-y-4">
          <Field label="Número que envia as mensagens" hint="Com DDI e DDD, ex.: 5531999998888. É o WhatsApp que deve estar aberto no aparelho na hora de enviar.">
            <input className={cx(inputCls, !valid && 'ring-rose-400')} inputMode="tel" value={c.senderNumber} onChange={(e) => setC({ ...c, senderNumber: e.target.value.replace(/[^\d]/g, '') })} placeholder="5531999998888" />
          </Field>
          <Field label="Nome de quem assina" hint="Entra na variável {atendente}. Mensagem assinada por uma pessoa responde melhor que “Equipe”.">
            <input className={inputCls} value={c.senderName} onChange={(e) => setC({ ...c, senderName: e.target.value })} />
          </Field>
          <Field label="Dias sem repetir a mesma etapa (padrão)" hint="Cada etapa tem o seu próprio intervalo; este vale para as que não definem.">
            <input type="number" min={1} max={60} className={inputCls} value={c.dedupDays} onChange={(e) => setC({ ...c, dedupDays: Number(e.target.value) })} />
          </Field>
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <Toggle checked={c.requireOptIn} onChange={(v) => setC({ ...c, requireOptIn: v })} label="Mensagens de marketing só para quem aceitou no cadastro" />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Mensagens sobre a conta (pagamento, renovação, cancelamento) continuam liberadas. Recomendado ligar quando a maioria da base já tiver passado pelo cadastro novo, que pede esse consentimento.
            </p>
          </div>
          <Button variant="primary" loading={saving} disabled={!valid} icon={<Save className="h-4 w-4" />} onClick={async () => {
            setSaving(true);
            try { await api.saveMessaging({ ...c, senderNumber: num }, 'Configuração do WhatsApp'); toast('Configuração salva'); onSaved(); }
            catch (e: any) { toast(e.message, 'err'); } finally { setSaving(false); }
          }}>Salvar configuração</Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Como o envio funciona">
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <Hand className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
              <div className="text-sm text-emerald-900">
                <div className="flex items-center gap-1.5 font-semibold">Semiautomático <CheckCircle2 className="h-4 w-4" />ativo</div>
                O sistema decide quem abordar e escreve a mensagem com os dados de cada cliente. Você confere e envia com um clique pelo WhatsApp do aparelho. Sem custo por mensagem e sem risco de bloqueio do número.
              </div>
            </div>
            <div className="flex gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <div className="text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Automático (próxima etapa)</div>
                Disparo sem clique exige a API oficial do WhatsApp (Meta): empresa verificada no Meta Business, número dedicado, cada modelo aprovado pela Meta antes do uso e cobrança por mensagem. Os modelos e as regras desta tela já são a base para isso; falta só a conta aprovada.
              </div>
            </div>
          </div>
        </Card>
        <Card title="Boas práticas que protegem o número">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>Mande em blocos ao longo do dia, não dezenas seguidas no mesmo minuto.</li>
            <li>Respeite quem pedir para parar: marque “Não quer receber” na ficha do cliente.</li>
            <li>Responda quem responder. Conversa de verdade é o que converte e o que o WhatsApp valoriza.</li>
            <li>Evite enviar entre 21h e 8h.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
