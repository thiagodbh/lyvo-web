import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { useApi, go } from '../ctx';
import { Button, Card, cx, dateBR, downloadCsv, Empty, ErrorBox, inputCls, Loading, PageHeader, useAsync, useToast } from '../ui';

const ACTION_LABEL: Record<string, string> = {
  grant_access: 'Liberou acesso', extend_trial: 'Estendeu trial', set_period_end: 'Alterou vencimento', revoke_access: 'Revogou acesso',
  block: 'Bloqueou conta', unblock: 'Desbloqueou conta', note: 'Adicionou nota', update_profile: 'Editou perfil',
  password_reset_link: 'Gerou link de senha', revoke_sessions: 'Derrubou sessões', set_admin: 'Alterou permissão de admin',
  apply_pending: 'Aplicou acesso pendente', delete_account: 'Excluiu conta (LGPD)', link_payment: 'Vinculou pagamento',
  save_billing_config: 'Alterou planos/gateways', rotate_webhook_token: 'Trocou token de webhook', set_native_secret: 'Alterou segredo de gateway',
  recompute_usage: 'Recalculou uso',
};

export default function AuditPage() {
  const api = useApi();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.listAudit(), [api]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (data || []).filter((a) => !q.trim() || [a.actorEmail, a.targetEmail, a.action, a.reason, ACTION_LABEL[a.action]]
    .some((x) => x && x.toLowerCase().includes(q.trim().toLowerCase()))), [data, q]);

  return (
    <div>
      <PageHeader title="Auditoria" desc="Toda alteração feita por um admin, com quem, quando, o motivo e o antes/depois."
        actions={<>
          <Button icon={<RefreshCw className="h-4 w-4" />} loading={busy} onClick={async () => {
            setBusy(true);
            try { const r = await api.recomputeUsage(); toast(`Uso recalculado para ${r.users} usuários`); reload(); } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
          }}>Recalcular uso</Button>
          <Button icon={<Download className="h-4 w-4" />} disabled={!rows.length} onClick={() => downloadCsv(`lyvo-auditoria-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((a) => ({
            data: dateBR(a.at, true), admin: a.actorEmail || '', acao: ACTION_LABEL[a.action] || a.action, usuario: a.targetEmail || '', motivo: a.reason || '', parametros: JSON.stringify(a.params || {}),
          })))}>Exportar CSV</Button>
        </>} />

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className={cx(inputCls, 'pl-9')} placeholder="Buscar por admin, usuário, ação ou motivo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card pad={false}>
          <ul className="divide-y divide-slate-100">
            {rows.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm"><span className="font-semibold text-slate-900">{ACTION_LABEL[a.action] || a.action}</span>
                      {a.targetEmail && <> · {a.targetUid
                        ? <button className="text-teal-700 hover:underline" onClick={() => go(`users?uid=${a.targetUid}`)}>{a.targetEmail}</button>
                        : <span className="text-slate-600">{a.targetEmail}</span>}</>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">por {a.actorEmail || '—'}{a.reason ? <> — <span className="text-slate-700">“{a.reason}”</span></> : null}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="tabular-nums">{dateBR(a.at, true)}</span>
                    {(a.before || a.after || a.params) && <button className="font-medium text-teal-700 hover:underline" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'ocultar' : 'detalhes'}</button>}
                  </div>
                </div>
                {open === a.id && (
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {(['params', 'before', 'after'] as const).map((k) => a[k] ? (
                      <div key={k}><div className="mb-1 text-[11px] font-medium uppercase text-slate-500">{k === 'params' ? 'parâmetros' : k === 'before' ? 'antes' : 'depois'}</div>
                        <pre className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-2 text-[11px] text-slate-200">{JSON.stringify(a[k], null, 2)}</pre></div>
                    ) : null)}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!rows.length && <Empty title="Nenhuma ação registrada." />}
        </Card>
      )}
    </div>
  );
}
