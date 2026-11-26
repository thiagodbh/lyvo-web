// Gráficos de Finanças: planos, finos e legíveis (padrão dos apps de finanças), na paleta do Lyvo.
// Paleta categórica validada (CVD e visão normal): teal da marca + laranja, azul, amarelo, rosa, violeta.
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SERIES = ['#0D9488', '#f47230', '#257de0', '#f2a600', '#ee7fac', '#6a4ce2'];
const REST = '#cbd5e1'; // "Demais categorias": neutro, nunca uma 7ª cor
const INCOME = '#0D9488';
const EXPENSE = '#f47230';

type Fmt = (v: number) => string;

const compact = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: a >= 10000 ? 0 : 1 })}k`;
  return `${Math.round(v)}`;
};

// ─── Para onde foi o dinheiro ────────────────────────────────────────────────
export function SpendingBreakdown({ items, fmt, hidden }: { items: { name: string; value: number }[]; fmt: Fmt; hidden: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (!total) return <Empty text="Nenhum gasto neste mês ainda." />;

  // as 6 maiores ganham cor; da 7ª em diante viram "Demais" (cinza)
  const top = sorted.slice(0, SERIES.length);
  const rest = sorted.slice(SERIES.length);
  const restTotal = rest.reduce((s, i) => s + i.value, 0);
  const segments = [...top.map((i, k) => ({ ...i, color: SERIES[k] })), ...(restTotal ? [{ name: `Demais (${rest.length})`, value: restTotal, color: REST }] : [])];
  const list = sorted.map((i, k) => ({ ...i, color: k < top.length ? SERIES[k] : REST }));
  const visible = showAll ? list : list.slice(0, 6);
  const max = sorted[0].value;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <p className="text-xs text-gray-500">Total gasto no mês</p>
        <p className="text-2xl font-bold tracking-tight text-gray-900">{fmt(total)}</p>
      </div>

      {/* barra de composição: cada bloco é uma categoria, separados por 2px */}
      <div className="mb-5 flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Composição dos gastos por categoria">
        {segments.map((s) => (
          <div key={s.name} title={`${s.name}: ${hidden ? '' : fmt(s.value) + ' · '}${pct(s.value)}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: 4 }} />
        ))}
      </div>

      {/* ranking: nome, valor e % escritos; a barra fina compara com a maior categoria */}
      <ul className="space-y-3">
        {visible.map((i) => (
          <li key={i.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
                <span className="truncate font-semibold text-gray-800">{i.name.trim()}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-bold text-gray-900">{fmt(i.value)}</span>
                <span className="ml-2 inline-block w-9 text-right text-xs text-gray-400">{pct(i.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.color }} />
            </div>
          </li>
        ))}
      </ul>
      {list.length > 6 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 self-start text-xs font-bold uppercase tracking-wider text-lyvo-primary">
          {showAll ? 'Ver menos' : `Ver todas (${list.length})`}
        </button>
      )}
    </div>
  );
}

// ─── Entradas x saídas nos últimos meses ─────────────────────────────────────
type MonthRow = { month: string; income: number; expense: number };

export function IncomeExpenseChart({ data, fmt, hidden }: { data: MonthRow[]; fmt: Fmt; hidden: boolean }) {
  if (!data.some((d) => d.income || d.expense)) return <Empty text="Sem movimentação nos últimos meses." />;
  const rows = data.map((d) => ({ ...d, month: d.month.replace('.', ''), result: d.income - d.expense }));
  const last = rows[rows.length - 1];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">Resultado de {last.month}</p>
          <p className={`text-2xl font-bold tracking-tight ${last.result >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {hidden ? fmt(0) : `${last.result >= 0 ? '+' : '−'} ${fmt(Math.abs(last.result))}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 pt-1 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} />Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE }} />Saídas</span>
        </div>
      </div>

      <div className="min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => (hidden ? '' : compact(v))} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} content={<MonthTip fmt={fmt} hidden={hidden} />} />
            <Bar dataKey="income" name="Entradas" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="expense" name="Saídas" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* resultado de cada mês, escrito: sobra ou falta */}
      <div className="mt-3 grid gap-1 border-t border-gray-100 pt-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((r) => (
          <div key={r.month} className="text-center">
            <p className="text-[10px] uppercase text-gray-400">{r.month}</p>
            <p className={`truncate text-[11px] font-bold tabular-nums ${r.result >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {hidden ? '•••' : `${r.result >= 0 ? '+' : '−'}${compact(Math.abs(r.result))}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthTip({ active, payload, fmt, hidden }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as MonthRow & { result: number };
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold capitalize text-gray-900">{r.month}</p>
      <p className="flex justify-between gap-4 text-gray-600"><span>Entradas</span><span className="font-semibold tabular-nums text-gray-900">{fmt(r.income)}</span></p>
      <p className="flex justify-between gap-4 text-gray-600"><span>Saídas</span><span className="font-semibold tabular-nums text-gray-900">{fmt(r.expense)}</span></p>
      {!hidden && <p className={`mt-1 flex justify-between gap-4 border-t border-gray-100 pt-1 font-bold ${r.result >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        <span>{r.result >= 0 ? 'Sobrou' : 'Faltou'}</span><span className="tabular-nums">{fmt(Math.abs(r.result))}</span></p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-gray-400">{text}</div>;
}
