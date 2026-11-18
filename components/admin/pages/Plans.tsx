import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Star } from 'lucide-react';
import { useApi } from '../ctx';
import type { BillingConfig, Plan, PlanInterval, ProviderId } from '../types';
import { brl, Button, Card, cx, ErrorBox, Field, inputCls, Loading, Modal, PageHeader, Pill, PROVIDER_LABEL, Toggle, useAsync, useToast } from '../ui';

const INTERVALS: { v: PlanInterval; l: string; m: number }[] = [
  { v: 'month', l: 'Mensal', m: 1 }, { v: 'quarter', l: 'Trimestral', m: 3 }, { v: 'semester', l: 'Semestral', m: 6 }, { v: 'year', l: 'Anual', m: 12 }, { v: 'lifetime', l: 'Vitalício', m: 0 },
];
const PROVIDERS: ProviderId[] = ['olimpopay', 'lastlink', 'kiwify', 'hotmart', 'cakto'];

export default function PlansPage() {
  const api = useApi();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getConfig(), [api]);
  const [cfg, setCfg] = useState<BillingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [askReason, setAskReason] = useState(false);
  const [reason, setReason] = useState('');
  useEffect(() => { if (data) setCfg(JSON.parse(JSON.stringify(data))); }, [data]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !cfg) return <Loading />;
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data);

  const setPlan = (i: number, p: Partial<Plan>) => setCfg({ ...cfg, plans: cfg.plans.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const activeProvider = cfg.providerOrder.find((p) => cfg.providers[p]?.enabled);

  return (
    <div>
      <PageHeader title="Planos e preços" desc="O que aparece no paywall, quanto custa e qual produto de cada gateway corresponde a cada plano."
        actions={<>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCfg({ ...cfg, plans: [...cfg.plans, { id: `plano${cfg.plans.length + 1}`, name: 'Novo plano', price: 0, interval: 'month', active: false, checkout: {}, externalIds: {} }] })}>Novo plano</Button>
          <Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={!dirty} onClick={() => setAskReason(true)}>Salvar alterações</Button>
        </>} />

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Dias de teste grátis (1 a 7)" hint="Vale para novos cadastros e aparece na seção de preços da landing. Os outros textos da landing citam 3 dias."><input type="number" min={1} max={7} className={inputCls} value={cfg.trialDays} onChange={(e) => setCfg({ ...cfg, trialDays: Number(e.target.value) })} /></Field>
          <Field label="Dias de carência" hint="Acesso mantido após renovação em atraso."><input type="number" min={0} max={15} className={inputCls} value={cfg.graceDays} onChange={(e) => setCfg({ ...cfg, graceDays: Number(e.target.value) })} /></Field>
          <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <div className="text-xs text-slate-500">Checkout ativo no paywall</div>
            <div className="mt-1 font-semibold">{activeProvider ? PROVIDER_LABEL[activeProvider] : 'nenhum gateway habilitado'}</div>
            <div className="mt-0.5 text-xs text-slate-500">Muda na aba Gateways (ordem de prioridade).</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {cfg.plans.map((p, i) => {
          const months = INTERVALS.find((x) => x.v === p.interval)?.m || 0;
          const linkUsed = cfg.providerOrder.find((pr) => cfg.providers[pr]?.enabled && (pr === 'olimpopay' ? !!INTERVALS.find((x) => x.v === p.interval)?.m : p.checkout[pr]));
          return (
            <Card key={i} title={<span className="flex items-center gap-2">{p.name}{p.highlight && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}{!p.active && <Pill>inativo</Pill>}</span>}
              action={<button onClick={() => setCfg({ ...cfg, plans: cfg.plans.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remover plano"><Trash2 className="h-4 w-4" /></button>}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome"><input className={inputCls} value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} /></Field>
                <Field label="ID interno" hint="minúsculas, sem espaço. Não mude depois de ter assinantes."><input className={cx(inputCls, 'font-mono')} value={p.id} onChange={(e) => setPlan(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} /></Field>
                <Field label="Preço (R$)" hint={months ? `${brl(p.price / months)} / mês no MRR` : 'não entra no MRR'}><input type="number" step="0.01" min={0} className={inputCls} value={p.price} onChange={(e) => setPlan(i, { price: Number(e.target.value) })} /></Field>
                <Field label="Cobrança"><select className={inputCls} value={p.interval} onChange={(e) => setPlan(i, { interval: e.target.value as PlanInterval })}>{INTERVALS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select></Field>
                <Field label="Texto de parcelamento"><input className={inputCls} value={p.installmentsText || ''} placeholder="ou até 5x no cartão" onChange={(e) => setPlan(i, { installmentsText: e.target.value })} /></Field>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <Toggle checked={p.active} onChange={(v) => setPlan(i, { active: v })} label="Visível no paywall" />
                  <Toggle checked={!!p.highlight} onChange={(v) => setPlan(i, { highlight: v })} label="Destacar como recomendado" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Benefícios (um por linha)"><textarea rows={2} className={inputCls} value={(p.features || []).join('\n')} onChange={(e) => setPlan(i, { features: e.target.value.split('\n') })} /></Field>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por gateway</div>
                  <div className="text-xs text-slate-500">Paywall usa: <span className="font-medium text-slate-800">{linkUsed ? PROVIDER_LABEL[linkUsed] : '— sem link ativo'}</span></div>
                </div>
                <div className="space-y-3">
                  {PROVIDERS.map((pr) => pr === 'olimpopay' ? (
                    <div key={pr} className={cx('grid gap-2 rounded-lg p-2.5 sm:grid-cols-[90px_1fr] sm:items-center', cfg.providers[pr]?.enabled ? 'bg-amber-50/70 ring-1 ring-amber-200' : 'bg-slate-50/50 opacity-60')}>
                      <div className="text-xs font-semibold text-slate-700">{PROVIDER_LABEL[pr]}</div>
                      <div className="text-xs text-slate-600">{months
                        ? <>Sem link fixo: o Lyvo cria a assinatura na hora ({p.interval === 'year' ? 'anual' : `a cada ${months} mês(es)`}, {brl(p.price)}) e envia o cliente ao link da Olimpo.</>
                        : <span className="text-amber-700">Plano vitalício não é suportado pela assinatura da Olimpo; usa o próximo gateway.</span>}</div>
                    </div>
                  ) : (
                    <div key={pr} className={cx('grid gap-2 rounded-lg p-2.5 sm:grid-cols-[90px_1fr_1fr] sm:items-center', cfg.providers[pr]?.enabled ? 'bg-slate-50' : 'bg-slate-50/50 opacity-60')}>
                      <div className="text-xs font-semibold text-slate-700">{PROVIDER_LABEL[pr]}</div>
                      <input className={cx(inputCls, 'text-xs')} placeholder="Link do checkout (https://…)" value={p.checkout[pr] || ''}
                        onChange={(e) => setPlan(i, { checkout: { ...p.checkout, [pr]: e.target.value.trim() || undefined } })} />
                      <input className={cx(inputCls, 'font-mono text-xs')} placeholder="IDs de produto/oferta/plano, separados por vírgula" value={(p.externalIds[pr] || []).join(', ')}
                        onChange={(e) => setPlan(i, { externalIds: { ...p.externalIds, [pr]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Os IDs ligam o pagamento ao plano certo. Se ficar vazio, o sistema tenta pela recorrência e depois pelo valor (±20%). Ache o ID no payload em Pagamentos → Detalhes.</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={askReason} onClose={() => setAskReason(false)} title="Salvar planos"
        footer={<><Button variant="ghost" onClick={() => setAskReason(false)}>Cancelar</Button>
          <Button variant="primary" loading={saving} disabled={reason.trim().length < 3} onClick={async () => {
            setSaving(true);
            try { await api.saveConfig({ ...cfg, plans: cfg.plans.map((p) => ({ ...p, features: (p.features || []).map((f) => f.trim()).filter(Boolean) })) }, reason); toast('Planos salvos'); setAskReason(false); setReason(''); reload(); }
            catch (e: any) { toast(e.message, 'err'); } finally { setSaving(false); }
          }}>Salvar</Button></>}>
        <p className="mb-3 text-sm text-slate-600">Vale na hora para o paywall. Assinantes atuais não mudam de preço.</p>
        <Field label="Motivo (auditoria)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: reajuste do mensal para R$ 29,90" /></Field>
      </Modal>
    </div>
  );
}
