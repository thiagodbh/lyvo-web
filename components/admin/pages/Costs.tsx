import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useApi } from '../ctx';
import { brl, Button, Card, cx, ErrorBox, Field, inputCls, Kpi, Loading, num, PageHeader, useAsync, useToast } from '../ui';
import type { CostMonth, CostsConfig } from '../types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const cents = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 });
const PROV: Record<string, string> = { olimpopay: 'Olimpo Pay', lastlink: 'LastLink', kiwify: 'Kiwify', hotmart: 'Hotmart', cakto: 'Cakto' };

export default function CostsPage() {
  const api = useApi();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.costs(), [api]);
  const [sel, setSel] = useState(0);
  const [cfg, setCfg] = useState<CostsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setCfg(JSON.parse(JSON.stringify(data.config))); }, [data]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data || !cfg) return <Loading label="Calculando custos…" />;
  const m: CostMonth = data.months[sel];
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data.config);

  const save = async () => {
    setSaving(true);
    try { await api.saveCosts(cfg); toast('Custos salvos'); reload(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setSaving(false); }
  };

  const parts = [
    { label: 'IA (Gemini)', v: m.ai.brl, cls: 'bg-violet-500' },
    { label: 'Taxas de pagamento', v: m.fees, cls: 'bg-amber-500' },
    { label: 'Custos fixos', v: m.fixed, cls: 'bg-slate-500' },
    { label: 'Google Cloud / Firebase', v: m.cloud || 0, cls: 'bg-sky-500' },
  ];
  const maxPart = Math.max(...parts.map((p) => p.v), 0.0001);

  return (
    <div>
      <PageHeader title="Custos" desc="Quanto custa manter o Lyvo no ar: IA medida chamada a chamada, taxas calculadas sobre cada pagamento e custos fixos que você informa."
        actions={
          <div className="flex rounded-lg bg-slate-100 p-1">
            {data.months.map((x, i) => (
              <button key={x.month} onClick={() => setSel(i)}
                className={cx('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium', sel === i ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                {monthLabel(x.month)}{x.isCurrent ? ' (atual)' : ''}
              </button>
            ))}
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Custo total do mês" value={brl(m.total)} sub={m.isCurrent ? 'até agora' : 'fechado'} />
        <Kpi label="Receita do mês" value={brl(m.revenue)} sub="pagamentos confirmados − estornos" />
        <Kpi label="Resultado" value={brl(m.margin)} tone={m.margin >= 0 ? 'up' : 'down'} sub={m.revenue ? `${Math.round((m.margin / m.revenue) * 100)}% da receita` : 'sem receita no mês'} />
        <Kpi label="Custo de IA por usuário" value={brl(m.ai.perUserBrl)} sub={`${num(m.ai.users)} usuário(s) usaram a IA`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Para onde vai o dinheiro" className="xl:col-span-2">
          <div className="space-y-3">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{p.label}</span><span className="font-medium tabular-nums text-slate-900">{brl(p.v)}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className={cx('h-2 rounded-full', p.cls)} style={{ width: `${(p.v / maxPart) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          {m.cloud == null && <p className="mt-3 text-xs text-amber-700">A fatura do Google Cloud deste mês não foi informada. Ela entra como zero até você preencher abaixo.</p>}
        </Card>

        <Card title={`IA · ${data.model}`}>
          <dl className="space-y-2 text-sm">
            {[
              ['Chamadas', num(m.ai.calls)],
              ['Com foto', num(m.ai.images)],
              ['Falhas do Google', num(m.ai.errors)],
              ['Tokens enviados / recebidos', `${num(m.ai.inTok)} / ${num(m.ai.outTok)}`],
              ['Custo em dólar', `US$ ${m.ai.usd.toFixed(4).replace('.', ',')}`],
              ['Custo por mensagem', cents(m.ai.perCallBrl)],
              ...(m.ai.projectedBrl != null ? [['Projeção do mês', brl(m.ai.projectedBrl)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-medium tabular-nums text-slate-900">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Calculado pelos tokens que o Google informa em cada resposta × tabela pública (US$ {data.price.inText} entrada / US$ {data.price.out} saída por milhão). A fatura real do Google pode variar alguns centavos.
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Quem mais usa a IA" pad={false}>
          {m.ai.top.length ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {m.ai.top.map((t) => (
                  <tr key={t.uid}><td className="px-4 py-2 text-slate-700">{t.email}</td><td className="px-4 py-2 text-right tabular-nums text-slate-500">{num(t.calls)} msgs</td><td className="px-4 py-2 text-right font-medium tabular-nums">{brl(t.brl)}</td></tr>
                ))}
              </tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-slate-500">Nenhuma chamada registrada neste mês ainda.</p>}
        </Card>

        <Card title="Taxas por gateway" pad={false}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Gateway</th><th className="px-4 py-2 text-right">Receita</th><th className="px-4 py-2 text-right">Pagamentos</th><th className="px-4 py-2 text-right">Taxa</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(m.byProvider).map(([p, v]) => (
                <tr key={p}><td className="px-4 py-2">{PROV[p] || p}</td><td className="px-4 py-2 text-right tabular-nums">{brl(v.revenue)}</td><td className="px-4 py-2 text-right tabular-nums">{v.payments}</td><td className="px-4 py-2 text-right font-medium tabular-nums">{brl(v.fee)}</td></tr>
              ))}
              {!Object.keys(m.byProvider).length && <tr><td colSpan={4} className="px-4 py-3 text-slate-500">Nenhum pagamento neste mês.</td></tr>}
            </tbody>
          </table></div>
        </Card>
      </div>

      <Card className="mt-4" title="Configurar custos" action={<Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={!dirty} loading={saving} onClick={save}>Salvar</Button>}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Taxas dos gateways</h4>
            {Object.keys(PROV).filter((p) => p === 'olimpopay' || p === 'lastlink' || cfg.fees[p]).map((p) => (
              <div key={p} className="grid grid-cols-[1fr_80px_80px] items-end gap-2">
                <span className="pb-2 text-sm text-slate-700">{PROV[p]}</span>
                <Field label="%"><input type="number" step="0.01" min={0} className={inputCls} value={cfg.fees[p]?.pct ?? 0}
                  onChange={(e) => setCfg({ ...cfg, fees: { ...cfg.fees, [p]: { ...(cfg.fees[p] || { pct: 0, fixed: 0 }), pct: Number(e.target.value) } } })} /></Field>
                <Field label="R$ fixo"><input type="number" step="0.01" min={0} className={inputCls} value={cfg.fees[p]?.fixed ?? 0}
                  onChange={(e) => setCfg({ ...cfg, fees: { ...cfg.fees, [p]: { ...(cfg.fees[p] || { pct: 0, fixed: 0 }), fixed: Number(e.target.value) } } })} /></Field>
              </div>
            ))}
            <Field label="Dólar (R$)" hint="Converte o custo da IA, que o Google cobra em dólar.">
              <input type="number" step="0.01" min={1} className={inputCls} value={cfg.usdBrl} onChange={(e) => setCfg({ ...cfg, usdBrl: Number(e.target.value) })} />
            </Field>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Custos fixos mensais</h4>
            {cfg.fixed.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_100px_32px] items-center gap-2">
                <input className={inputCls} placeholder="Ex.: Vercel" value={f.name} onChange={(e) => { const x = [...cfg.fixed]; x[i] = { ...f, name: e.target.value }; setCfg({ ...cfg, fixed: x }); }} />
                <input type="number" step="0.01" min={0} className={inputCls} value={f.amountBrl} onChange={(e) => { const x = [...cfg.fixed]; x[i] = { ...f, amountBrl: Number(e.target.value) }; setCfg({ ...cfg, fixed: x }); }} />
                <button onClick={() => setCfg({ ...cfg, fixed: cfg.fixed.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCfg({ ...cfg, fixed: [...cfg.fixed, { id: `f${Date.now()}`, name: '', amountBrl: 0 }] })}>Adicionar custo</Button>
            <p className="text-xs text-slate-500">Vercel, domínio, chip do WhatsApp, ferramentas… Valor por mês, em reais.</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Fatura do Google Cloud / Firebase</h4>
            {data.months.map((x) => (
              <div key={x.month}><Field label={monthLabel(x.month)}>
                <input type="number" step="0.01" min={0} className={inputCls} placeholder="não informado" value={cfg.cloudBills[x.month] ?? ''}
                  onChange={(e) => { const b = { ...cfg.cloudBills }; if (e.target.value === '') delete b[x.month]; else b[x.month] = Number(e.target.value); setCfg({ ...cfg, cloudBills: b }); }} />
              </Field></div>
            ))}
            <p className="text-xs text-slate-500">Copie de console.cloud.google.com → Faturamento, projeto lyvo-web. Inclui banco, funções e, se o Gemini estiver no mesmo projeto, a IA também (aí não some duas vezes).</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
