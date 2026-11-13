import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FlaskConical, KeyRound, RefreshCw, Save, ShieldAlert, CheckCircle2, CircleDashed, PlugZap, Repeat } from 'lucide-react';
import { useApi } from '../ctx';
import type { BillingConfig, GatewayInfo, ProviderId } from '../types';
import { brl, Button, Card, CopyButton, cx, dateBR, ErrorBox, Field, inputCls, Loading, Modal, PageHeader, Pill, rel, Toggle, useAsync, useToast } from '../ui';

const HELP: Record<ProviderId, string> = {
  olimpopay: 'Olimpo Pay funciona por API: o Lyvo cria a assinatura e manda o cliente para o link de pagamento da Olimpo (Pix ou cartão). O acesso é liberado conferindo a assinatura na API a cada 15 min e quando o cliente clica “Verificar meu pagamento”. O webhook abaixo é opcional e só acelera a conferência (a Olimpo não assina o webhook, então ele nunca libera acesso sozinho). A chave da API fica no secret OLIMPO_API_KEY do Firebase.',
  lastlink: 'Fallback. No painel da LastLink, na configuração de Webhook, cole a URL abaixo e marque os eventos de compra, recorrência, cancelamento, expiração, reembolso e chargeback. A LastLink não documenta assinatura de webhook, então o token na URL é a proteção.',
  kiwify: 'Na área de Webhooks da Kiwify, cole a URL e selecione compra aprovada, reembolso, chargeback e eventos de assinatura. Opcional: cadastre o token da Kiwify como segredo nativo.',
  hotmart: 'Na configuração de Webhook da Hotmart (versão 2.0.0), cole a URL. Opcional: cadastre o Hottok como segredo nativo.',
  cakto: 'Na área de Webhooks da Cakto, cole a URL e selecione os eventos. Opcional: cadastre o “secret” do app como segredo nativo.',
};

export default function GatewaysPage() {
  const api = useApi();
  const toast = useToast();
  const cfgQ = useAsync(() => api.getConfig(), [api]);
  const gwQ = useAsync(() => api.gateways(), [api]);
  const [cfg, setCfg] = useState<BillingConfig | null>(null);
  const [reason, setReason] = useState('');
  const [ask, setAsk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<ProviderId | null>(null);
  const [secretFor, setSecretFor] = useState<ProviderId | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => { if (cfgQ.data) setCfg(JSON.parse(JSON.stringify(cfgQ.data))); }, [cfgQ.data]);

  if (cfgQ.error || gwQ.error) return <ErrorBox error={cfgQ.error || gwQ.error} onRetry={() => { cfgQ.reload(); gwQ.reload(); }} />;
  if (!cfg || !gwQ.data) return <Loading />;
  const dirty = JSON.stringify(cfg) !== JSON.stringify(cfgQ.data);
  const info = new Map<ProviderId, GatewayInfo>(gwQ.data.map((g) => [g.id, g] as [ProviderId, GatewayInfo]));
  const primary = cfg.providerOrder.find((p) => cfg.providers[p]?.enabled);

  const move = (i: number, d: -1 | 1) => {
    const o = [...cfg.providerOrder];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setCfg({ ...cfg, providerOrder: o });
  };
  const setProv = (p: ProviderId, patch: Partial<BillingConfig['providers'][ProviderId]>) =>
    setCfg({ ...cfg, providers: { ...cfg.providers, [p]: { ...cfg.providers[p], ...patch } } });

  return (
    <div>
      <PageHeader title="Gateways de pagamento" desc="Qual plataforma recebe as vendas, em que ordem, e como cada uma avisa o Lyvo."
        actions={<Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={!dirty} onClick={() => setAsk(true)}>Salvar alterações</Button>} />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Checkout principal agora</div>
            <div className="mt-0.5 text-lg font-semibold">{primary ? cfg.providers[primary].label : 'Nenhum — paywall sem botão de compra!'}</div>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              <strong>Fallback automático:</strong> o paywall tenta o <em>primeiro gateway habilitado</em>. Se for a Olimpo Pay e a API
              falhar na hora (fora do ar, sem adquirente), o cliente já vê o botão do próximo da lista. Para trocar o principal de vez,
              mude a ordem ou desabilite e salve: vale na hora, sem deploy. Webhooks de todos os habilitados continuam sendo processados.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {cfg.providerOrder.map((p, i) => {
          const g: GatewayInfo | undefined = info.get(p);
          const pc = cfg.providers[p];
          const url = urls[p] || g?.webhookUrl || null;
          return (
            <Card key={p} className={cx(!pc.enabled && 'opacity-80')}>
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex items-start gap-3 lg:w-60 lg:flex-shrink-0">
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === cfg.providerOrder.length - 1} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Descer"><ArrowDown className="h-4 w-4" /></button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums text-slate-400">#{i + 1}</span>
                      <span className="font-semibold">{pc.label}</span>
                      {p === primary && <Pill tone="green">principal</Pill>}
                    </div>
                    <div className="mt-2 flex flex-col items-start gap-2 whitespace-nowrap">
                      <Toggle checked={pc.enabled} onChange={(v) => setProv(p, { enabled: v })} label="Habilitado" />
                      <Toggle checked={pc.validated} onChange={(v) => setProv(p, { validated: v })} label={p === 'olimpopay' ? 'Validado em produção' : 'Mapeamento validado'} />
                      {pc.mode === 'api' || p === 'olimpopay' ? <span className="text-[11px] text-slate-500">checkout via API</span> : <span className="text-[11px] text-slate-500">checkout por link</span>}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat k="Eventos 30d" v={g?.events30d ?? 0} />
                    <Stat k="Receita 30d" v={brl(g?.revenue30d ?? 0)} />
                    <Stat k="Último evento" v={g?.lastEventAt ? rel(g.lastEventAt) : 'nunca'} />
                    <Stat k="Erros 30d" v={g?.errors30d ?? 0} warn={!!g?.errors30d} />
                  </div>

                  {p === 'olimpopay' && <OlimpoTools />}

                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      URL do webhook{p === 'olimpopay' ? ' (opcional — só acelera a conferência)' : ''}
                      {p === 'olimpopay' ? null : pc.validated ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />validado</span>
                        : <span className="inline-flex items-center gap-1 text-amber-700"><CircleDashed className="h-3.5 w-3.5" />validar com evento de teste</span>}
                    </div>
                    {url ? (
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                        <code className="flex-1 truncate rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-200">{url}</code>
                        <div className="flex flex-shrink-0 gap-2">
                          <CopyButton text={url} />
                          <Button size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={async () => {
                            if (!confirm('Gerar novo token? A URL antiga para de funcionar e você precisa atualizar no painel do gateway.')) return;
                            try { const r = await api.rotateToken(p); setUrls({ ...urls, [p]: r.webhookUrl }); toast('Novo token gerado'); } catch (e: any) { toast(e.message, 'err'); }
                          }}>Trocar token</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="primary" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={async () => {
                        try { const r = await api.rotateToken(p); setUrls({ ...urls, [p]: r.webhookUrl }); toast('URL gerada'); } catch (e: any) { toast(e.message, 'err'); }
                      }}>Gerar URL do webhook</Button>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{HELP[p]}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<FlaskConical className="h-3.5 w-3.5" />} onClick={() => setTest(p)}>Testar payload</Button>
                    {g?.supportsNative && (
                      <Button size="sm" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setSecretFor(p)}>
                        {g.hasNativeSecret ? 'Trocar segredo nativo' : 'Cadastrar segredo nativo'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4" title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" />Webhook antigo da LastLink</span>}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-600">
            O endpoint <code className="rounded bg-slate-100 px-1 text-xs">lastlinkWebhook</code> não tem token: qualquer pessoa que souber a URL consegue liberar acesso.
            Ele fica ligado só para não quebrar as vendas durante a troca. Depois de colar a URL nova na LastLink e ver um evento chegar, desligue.
          </p>
          <Toggle checked={cfg.allowLegacyLastlink} onChange={(v) => setCfg({ ...cfg, allowLegacyLastlink: v })} label={cfg.allowLegacyLastlink ? 'Aceitando' : 'Desligado'} />
        </div>
      </Card>

      <Modal open={ask} onClose={() => setAsk(false)} title="Salvar gateways"
        footer={<><Button variant="ghost" onClick={() => setAsk(false)}>Cancelar</Button>
          <Button variant="primary" loading={saving} disabled={reason.trim().length < 3} onClick={async () => {
            setSaving(true);
            try { await api.saveConfig(cfg, reason); toast('Gateways salvos'); setAsk(false); setReason(''); cfgQ.reload(); gwQ.reload(); }
            catch (e: any) { toast(e.message, 'err'); } finally { setSaving(false); }
          }}>Salvar</Button></>}>
        <p className="mb-3 text-sm text-slate-600">Checkout principal após salvar: <strong>{primary ? cfg.providers[primary].label : 'nenhum'}</strong>.</p>
        <Field label="Motivo (auditoria)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: LastLink instável, Kiwify como principal" /></Field>
      </Modal>

      {test && <DryRunModal provider={test} onClose={() => setTest(null)} />}
      {secretFor && <SecretModal provider={secretFor} onClose={() => { setSecretFor(null); gwQ.reload(); }} />}
    </div>
  );
}

function Stat({ k, v, warn }: { k: string; v: React.ReactNode; warn?: boolean }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200"><div className="text-[11px] text-slate-500">{k}</div><div className={cx('text-sm font-semibold tabular-nums', warn && 'text-rose-600')}>{v}</div></div>;
}

const SAMPLE: Record<ProviderId, string> = {
  olimpopay: JSON.stringify({ type: 'transaction', transaction_id: '98765432', external_reference: 'pedido-123', method: 'pix', total_price: '24.90', status: 'paid', customer: { name: 'Cliente Teste', document: '12345678901', email: 'cliente@exemplo.com', phone: '11999998888' }, created_at: '2026-11-13 12:50:31', updated_at: '2026-11-13 12:51:10', refund_at: null }, null, 2),
  lastlink: JSON.stringify({ Id: 'teste-123', IsTest: true, Event: 'Purchase_Order_Confirmed', CreatedAt: '2026-11-13T15:00:00', Data: { Buyer: { Email: 'cliente@exemplo.com', Name: 'Cliente Teste' }, Purchase: { PaymentId: 'pay-1', Recurrency: 1, RecurrenceNumber: 1, Price: { Value: 24.9 }, Payment: { PaymentMethod: 'pix' } }, Products: [{ Id: 'prod-1', Name: 'Lyvo' }], Plan: { Id: 'plan-1', Name: 'Mensal', Recurrency: 1, Amount: 24.9 } } }, null, 2),
  kiwify: JSON.stringify({ order_id: 'kw-1', webhook_event_type: 'order_approved', order_status: 'paid', Customer: { email: 'cliente@exemplo.com', full_name: 'Cliente Teste' }, Product: { product_id: 'kw-prod-1', product_name: 'Lyvo' }, Commissions: { charge_amount: 2490 } }, null, 2),
  hotmart: JSON.stringify({ id: 'hm-1', event: 'PURCHASE_APPROVED', version: '2.0.0', data: { buyer: { email: 'cliente@exemplo.com', name: 'Cliente Teste' }, product: { id: 123 }, purchase: { transaction: 'HP123', price: { value: 24.9 } } } }, null, 2),
  cakto: JSON.stringify({ event: 'purchase_approved', data: { id: 'ck-1', customer: { email: 'cliente@exemplo.com', name: 'Cliente Teste' }, amount: 24.9, product: { id: 'ck-prod-1' } } }, null, 2),
};

function DryRunModal({ provider, onClose }: { provider: ProviderId; onClose: () => void }) {
  const api = useApi();
  const [payload, setPayload] = useState(SAMPLE[provider]);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open wide onClose={onClose} title={`Testar payload — ${provider}`}
      footer={<><Button variant="ghost" onClick={onClose}>Fechar</Button><Button variant="primary" loading={busy} onClick={async () => {
        setBusy(true); setErr(''); setRes(null);
        try { setRes(await api.dryRun(provider, payload)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
      }}>Simular (não grava nada)</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Cole aqui um payload real (do log do gateway ou de Pagamentos → Detalhes). O sistema mostra como entenderia o evento: tipo, e-mail, plano, conta encontrada e o acesso resultante. <strong>Nada é gravado.</strong></p>
      <textarea rows={10} className={cx(inputCls, 'font-mono text-xs')} value={payload} onChange={(e) => setPayload(e.target.value)} />
      {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      {res && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Entendido como</div>
            <div><span className="text-slate-500">Tipo:</span> <strong>{res.normalized?.type || '—'}</strong> <span className="text-xs text-slate-500">({res.normalized?.rawType})</span></div>
            <div><span className="text-slate-500">E-mail:</span> {res.normalized?.email || <span className="text-rose-600">não encontrado</span>}</div>
            <div><span className="text-slate-500">Valor:</span> {brl(res.normalized?.amount)}</div>
            <div><span className="text-slate-500">IDs:</span> <span className="font-mono text-xs">{(res.normalized?.externalProductIds || []).join(', ') || '—'}</span></div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Efeito</div>
            <div><span className="text-slate-500">Plano:</span> {res.plan?.name || <span className="text-amber-700">não identificado</span>}</div>
            <div><span className="text-slate-500">Conta:</span> {res.matchedUid || <span className="text-amber-700">nenhuma com esse e-mail (ficaria pendente)</span>}</div>
            <div><span className="text-slate-500">Acesso:</span> {res.accessAfter ? <>{res.accessAfter.status} até {dateBR(res.accessAfter.currentPeriodEnd)}</> : 'não muda'}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SecretModal({ provider, onClose }: { provider: ProviderId; onClose: () => void }) {
  const api = useApi();
  const toast = useToast();
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Segredo nativo do gateway"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={busy} onClick={async () => {
        setBusy(true);
        try { await api.setNativeSecret(provider, secret); toast(secret ? 'Segredo salvo' : 'Segredo removido'); onClose(); } catch (e: any) { toast(e.message, 'err'); setBusy(false); }
      }}>{secret ? 'Salvar' : 'Remover segredo'}</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Validação extra, além do token na URL: {provider === 'hotmart' ? 'Hottok (header X-HOTMART-HOTTOK)' : provider === 'kiwify' ? 'token da Kiwify (assinatura HMAC na query “signature”)' : 'campo “secret” enviado no corpo'}. Fica guardado só no servidor; nem este painel consegue ler depois.</p>
      <input type="password" className={inputCls} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Cole o segredo (vazio = remover)" autoComplete="off" />
    </Modal>
  );
}

function OlimpoTools() {
  const api = useApi();
  const toast = useToast();
  const [ping, setPing] = useState<{ ok: boolean; error?: string } | null>(null);
  const [busy, setBusy] = useState<'ping' | 'sync' | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50/60 p-3 ring-1 ring-amber-200">
      <Button size="sm" loading={busy === 'ping'} icon={<PlugZap className="h-3.5 w-3.5" />} onClick={async () => {
        setBusy('ping'); try { setPing(await api.olimpoPing()); } catch (e: any) { setPing({ ok: false, error: e.message }); } finally { setBusy(null); }
      }}>Testar conexão com a API</Button>
      <Button size="sm" loading={busy === 'sync'} icon={<Repeat className="h-3.5 w-3.5" />} onClick={async () => {
        setBusy('sync');
        try { const r = await api.olimpoSyncAll(); toast(`${r.synced} assinatura(s) conferida(s), ${r.changed} com mudança${r.errors ? `, ${r.errors} erro(s)` : ''}`); }
        catch (e: any) { toast(e.message, 'err'); } finally { setBusy(null); }
      }}>Conferir assinaturas agora</Button>
      {ping && (ping.ok
        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />API respondendo com a chave configurada</span>
        : <span className="text-xs font-medium text-rose-700">Falhou: {ping.error}</span>)}
    </div>
  );
}
