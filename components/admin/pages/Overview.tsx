import { AlertTriangle, AlertOctagon, Info, ArrowRight, RefreshCw, MessageCircle } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi, go } from '../ctx';
import { brl, Button, Card, cx, dateBR, ErrorBox, Kpi, Loading, num, PageHeader, pct, PROVIDER_LABEL, rel, useAsync } from '../ui';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ALERT_STYLE = {
  critical: { icon: AlertOctagon, cls: 'bg-rose-50 ring-rose-200 text-rose-900', ic: 'text-rose-600' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 ring-amber-200 text-amber-900', ic: 'text-amber-600' },
  info: { icon: Info, cls: 'bg-slate-50 ring-slate-200 text-slate-800', ic: 'text-slate-500' },
};

function ChartTip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold tabular-nums">{money ? brl(payload[0].value) : num(payload[0].value)}</div>
    </div>
  );
}

export default function OverviewPage() {
  const api = useApi();
  const { data, error, loading, reload } = useAsync(() => api.overview(), [api]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const d = data!;
  const k = d.kpis;
  const revenue = d.series.revenueByMonth.map((r) => ({ label: `${MONTHS[Number(r.month.slice(5, 7)) - 1]}/${r.month.slice(2, 4)}`, value: Math.round(r.value * 100) / 100 }));
  const signups = d.series.signupsByDay.map((r) => ({ label: `${r.day.slice(8, 10)}/${r.day.slice(5, 7)}`, value: r.value }));
  const funnelMax = Math.max(1, d.funnel[0]?.value || 1);
  const provEntries = Object.entries(d.revenueByProvider) as [string, number][];
  const provTotal = provEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div>
      <PageHeader title="Visão geral" desc={`Atualizado ${rel(d.generatedAt)}`}
        actions={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={reload} loading={loading}>Atualizar</Button>} />

      {d.alerts.length > 0 && (
        <div className="mb-6 grid gap-2 md:grid-cols-2">
          {d.alerts.map((a, i) => {
            const s = ALERT_STYLE[a.level];
            const Icon = s.icon;
            return (
              <button key={i} onClick={() => a.link && go(a.link)}
                className={cx('flex items-start gap-3 rounded-xl p-3.5 text-left ring-1 transition hover:brightness-[0.98]', s.cls)}>
                <Icon className={cx('mt-0.5 h-4 w-4 flex-shrink-0', s.ic)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="mt-0.5 text-xs opacity-80">{a.detail}</div>
                </div>
                {a.link && <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-50" />}
              </button>
            );
          })}
        </div>
      )}

      <button onClick={() => go('messages')}
        className="mb-6 flex w-full flex-col gap-3 rounded-xl bg-slate-950 p-4 text-left text-white ring-1 ring-slate-900 transition hover:bg-slate-900 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1fa855]"><MessageCircle className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Central de mensagens</div>
          <div className="text-xs text-slate-300">
            {d.upcoming.trialsEnding72h.length} teste(s) acabando · {k.pastDue} em atraso · {d.upcoming.renewals7d.length} renovação(ões) na semana. Mensagens prontas para cada momento do funil.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5be38f]">Abrir fila de hoje<ArrowRight className="h-4 w-4" /></span>
      </button>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="MRR" value={brl(k.mrr)} sub={`ARR ${brl(k.arr, true)}`} hint="Receita recorrente mensal: anual ÷ 12 + mensal" />
        <Kpi label="Receita no mês" value={brl(k.revenueThisMonth)} sub={`30 dias: ${brl(k.revenue30d, true)}`} />
        <Kpi label="Pagantes" value={num(k.payingUsers)} sub={k.pastDue ? `${k.pastDue} em atraso` : 'nenhum em atraso'} tone={k.pastDue ? 'warn' : undefined} />
        <Kpi label="Conversão trial → pago" value={pct(k.trialConversion)} sub="de quem já terminou o trial" />
        <Kpi label="Churn 30d" value={pct(k.churn30d)} sub={k.refunds30d ? `reembolsos ${brl(k.refunds30d, true)}` : 'sem reembolsos'} tone={k.churn30d && k.churn30d > 0.08 ? 'down' : undefined} />
        <Kpi label="Ticket médio (ARPU)" value={brl(k.arpu)} sub="por pagante / mês" />
        <Kpi label="Usuários" value={num(k.totalUsers)} sub={`+${k.newUsers7d} em 7d · +${k.newUsers30d} em 30d`} tone="up" />
        <Kpi label="Em trial agora" value={num(k.trialUsers)} sub={`${d.upcoming.trialsEnding72h.length} acabam em 72h`} />
        <Kpi label="Ativos hoje" value={num(k.dau)} sub={`7d: ${k.wau} · 30d: ${k.mau}`} />
        <Kpi label="DAU / MAU" value={pct(k.mau ? k.dau / k.mau : null, 0)} sub="frequência de uso" />
        <Kpi label="Cortesias" value={num(k.courtesyUsers)} sub="acesso liberado manualmente" />
        <Kpi label="Perfil completo" value={pct(k.profileComplete, 0)} sub="cadastros com todos os dados" tone={k.profileComplete < 0.5 ? 'warn' : undefined} />
      </div>

      {k.inactive && (
        <Card className="mt-6" title="Clientes sumidos (com acesso e sem abrir o app)"
          action={<button onClick={() => go('messages')} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">Mandar lembretes <ArrowRight className="h-3.5 w-3.5" /></button>}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([
              ['idle3', '3 a 6 dias', k.inactive.d3, 'bg-slate-50 ring-slate-200'],
              ['idle7', '7 a 13 dias', k.inactive.d7, 'bg-amber-50 ring-amber-200'],
              ['idle14', '14 a 29 dias', k.inactive.d14, 'bg-orange-50 ring-orange-200'],
              ['idle30', '30 dias ou mais', k.inactive.d30, 'bg-rose-50 ring-rose-200'],
            ] as const).map(([f, label, v, cls]) => (
              <button key={f} onClick={() => go(`users?filter=${f}`)} className={cx('rounded-xl p-3 text-left ring-1 transition hover:brightness-95', cls)}>
                <div className="text-xl font-semibold tabular-nums text-slate-900">{num(v)}</div>
                <div className="text-xs text-slate-600">{label}</div>
              </button>
            ))}
            <div className="col-span-2 rounded-xl bg-slate-900 p-3 text-white md:col-span-1">
              <div className="text-xl font-semibold tabular-nums">{num(k.inactive.paying)}</div>
              <div className="text-xs text-slate-300">pagantes sumidos há 7+ dias: risco de cancelar</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">De {num(k.inactive.withAccess)} contas com acesso. “Acesso” = abriu o app ou registrou algo. Histórico anterior a esta versão vem do login do Firebase.</p>
        </Card>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card title="Receita por mês" className="xl:col-span-2">
          <div className="h-64">
            {revenue.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => brl(v, true)} />
                  <Tooltip content={<ChartTip money />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">Sem pagamentos registrados ainda.</div>}
          </div>
        </Card>

        <Card title="Funil (todos os cadastros)">
          <div className="space-y-3">
            {d.funnel.map((f, i) => {
              const prev = i > 0 ? d.funnel[i - 1].value : null;
              return (
                <div key={f.step}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-slate-700">{f.step}</span>
                    <span className="tabular-nums text-slate-900">{num(f.value)}
                      {prev ? <span className="ml-1.5 text-slate-400">{pct(prev ? f.value / prev : null, 0)}</span> : null}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(1.5, (f.value / funnelMax) * 100)}%`, opacity: 1 - i * 0.12 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">% ao lado = conversão a partir da etapa anterior.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Cadastros por dia (30 dias)" className="xl:col-span-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signups} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={4} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fill="url(#sg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Receita por gateway / planos">
          <div className="space-y-2.5">
            {provEntries.length === 0 && <div className="text-sm text-slate-500">Sem receita registrada.</div>}
            {[...provEntries].sort((a, b) => b[1] - a[1]).map(([p, v]) => (
              <div key={p}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{PROVIDER_LABEL[p] || p}</span><span className="tabular-nums">{brl(v)}</span></div>
                <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-slate-800" style={{ width: `${(v / provTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 text-xs font-medium text-slate-500">Pagantes por plano</div>
            <div className="flex gap-2">
              {d.planMix.map((p) => (
                <div key={p.planId} className="flex-1 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs text-slate-500">{p.name}</div>
                  <div className="text-lg font-semibold tabular-nums">{p.users}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Renovações nos próximos 7 dias" pad={false}
          action={<button className="text-xs font-medium text-teal-700 hover:underline" onClick={() => go('subscriptions')}>Ver assinaturas</button>}>
          <MiniList empty="Nenhuma renovação nos próximos 7 dias."
            rows={d.upcoming.renewals7d.map((r) => ({ uid: r.uid, title: r.name || r.email, sub: r.email, right: dateBR(r.at), right2: r.planId === 'annual' ? 'Anual' : r.planId === 'monthly' ? 'Mensal' : r.planId || '' }))} />
        </Card>
        <Card title="Trials terminando em 72h" pad={false}
          action={<span className="text-xs text-slate-500">quem não ativou dificilmente paga</span>}>
          <MiniList empty="Nenhum trial terminando."
            rows={d.upcoming.trialsEnding72h.map((r) => ({ uid: r.uid, title: r.name || r.email, sub: r.email, right: rel(r.at), right2: r.activated ? 'ativou' : 'não ativou', warn: !r.activated }))} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AcqTable title="Aquisição por origem (utm_source)" rows={d.acquisition.bySource} />
        <AcqTable title="Aquisição por campanha" rows={d.acquisition.byCampaign} />
      </div>
    </div>
  );
}

function MiniList({ rows, empty }: { rows: { uid: string; title: string; sub: string; right: string; right2?: string; warn?: boolean }[]; empty: string }) {
  if (!rows.length) return <div className="px-4 py-8 text-center text-sm text-slate-500">{empty}</div>;
  return (
    <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
      {rows.map((r) => (
        <li key={r.uid}>
          <button onClick={() => go(`users?uid=${r.uid}`)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
              <div className="truncate text-xs text-slate-500">{r.sub}</div>
            </div>
            <div className="text-right">
              <div className="text-xs tabular-nums text-slate-700">{r.right}</div>
              {r.right2 && <div className={cx('text-[11px]', r.warn ? 'font-medium text-amber-700' : 'text-slate-400')}>{r.right2}</div>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AcqTable({ title, rows }: { title: string; rows: { key: string; signups: number; paid: number }[] }) {
  return (
    <Card title={title} pad={false}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-slate-500"><th className="px-4 py-2 font-medium">Origem</th><th className="px-4 py-2 text-right font-medium">Cadastros</th><th className="px-4 py-2 text-right font-medium">Pagaram</th><th className="px-4 py-2 text-right font-medium">Conv.</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="max-w-[180px] truncate px-4 py-2 text-slate-800">{r.key}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.signups}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.paid}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-600">{pct(r.signups ? r.paid / r.signups : null, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Só cadastros novos (após este deploy) terão origem gravada.</p>
    </Card>
  );
}
