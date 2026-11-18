import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useApi, go } from '../ctx';
import { Button, Card, cx, dateBR, ErrorBox, Loading, PageHeader, useAsync } from '../ui';
import type { HealthCheck } from '../types';

const ICON = {
  ok: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  warn: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  fail: <XCircle className="h-5 w-5 text-red-600" />,
};

const MANUAL = [
  'Compra real de teste pela Olimpo Pay (plano mensal, seu CPF) → acesso liberado sozinho em até 1 min ao voltar.',
  'Na Olimpo, estornar essa compra → em até 15 min o acesso cai e o pagamento aparece como reembolsado.',
  'Cadastro novo numa aba anônima → aparece em Usuários com nome, celular e trial com os dias de Planos.',
  'Landing: clicar em “Assinar” de um plano → cadastro → abre o checkout do mesmo plano.',
  'Mensagens: enviar um modelo para você mesmo → abre o WhatsApp com o texto e o envio fica no Histórico.',
  'LastLink: colar a URL nova do webhook, fazer uma venda de teste → evento aparece em Pagamentos; depois desligar o webhook antigo.',
];

export default function HealthPage() {
  const api = useApi();
  const [n, setN] = useState(0);
  const { data, error, loading } = useAsync(async () => {
    const [h, rules] = await Promise.all([api.health(), api.probeRules()]);
    return { at: h.at, checks: [...h.checks, rules] as HealthCheck[] };
  }, [api, n]);

  const count = (s: string) => (data?.checks || []).filter((c) => c.status === s).length;

  return (
    <div>
      <PageHeader title="Diagnóstico" desc="Testa ao vivo cada integração do sistema. Verde = funcionando; amarelo = falta configurar ou ainda sem dados; vermelho = quebrado."
        actions={<Button icon={<RefreshCw className="h-4 w-4" />} loading={loading} onClick={() => setN((x) => x + 1)}>Testar de novo</Button>} />
      {error ? <ErrorBox error={error} onRetry={() => setN((x) => x + 1)} /> : !data ? <Loading label="Testando integrações…" /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(['ok', 'warn', 'fail'] as const).map((s) => (
              <div key={s} className={cx('rounded-xl p-4 ring-1', s === 'ok' ? 'bg-emerald-50 ring-emerald-200' : s === 'warn' ? 'bg-amber-50 ring-amber-200' : 'bg-red-50 ring-red-200')}>
                <div className="text-2xl font-semibold text-slate-900">{count(s)}</div>
                <div className="text-xs text-slate-600">{s === 'ok' ? 'funcionando' : s === 'warn' ? 'atenção' : 'com falha'}</div>
              </div>
            ))}
          </div>
          <Card pad={false} title={`Verificações · ${dateBR(data.at, true)}`}>
            <ul className="divide-y divide-slate-100">
              {data.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0">{ICON[c.status]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{c.label}</div>
                    <div className="text-sm text-slate-600 break-words">{c.detail}</div>
                  </div>
                  {c.link && c.status !== 'ok' && (
                    <button onClick={() => go(c.link!)} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">
                      Resolver <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Testes manuais (uma vez, depois do deploy)">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              {MANUAL.map((m) => <li key={m}>{m}</li>)}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
