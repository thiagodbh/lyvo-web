import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, AlertTriangle } from 'lucide-react';
import type { UserRow } from '../types';
import { Button, cx, inputCls, Modal, useToast } from '../ui';
import { PHASE_STYLE, STAGE_BY_ID, Stage, StageId, Template, missingVars, render, waLink, phoneDigits } from './funnel';

/** Formatação do WhatsApp: *negrito*, _itálico_, ~riscado~ e links clicáveis. */
function waFormat(line: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/\S+)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('http')) out.push(<span key={key + i++} className="break-all text-[#027eb5] underline">{t}</span>);
    else if (t[0] === '*') out.push(<strong key={key + i++}>{t.slice(1, -1)}</strong>);
    else if (t[0] === '_') out.push(<em key={key + i++}>{t.slice(1, -1)}</em>);
    else out.push(<s key={key + i++}>{t.slice(1, -1)}</s>);
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function WhatsAppBubble({ text, compact }: { text: string; compact?: boolean }) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={cx('rounded-xl bg-[#efeae2] p-3', compact ? '' : 'sm:p-4')}>
      <div className="relative ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 pb-1.5 pt-2 text-[13.5px] leading-[1.45] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        <div className="whitespace-pre-wrap break-words">
          {text.split('\n').map((l, i) => <div key={i} className={l ? '' : 'h-[0.7em]'}>{waFormat(l, `l${i}-`)}</div>)}
        </div>
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781]">{now}<Check className="h-3 w-3 text-[#53bdeb]" /></div>
      </div>
    </div>
  );
}

export function StageChip({ stage }: { stage: Stage }) {
  const s = PHASE_STYLE[stage.phase];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', s.chip)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />{stage.label}
    </span>
  );
}

export function Initials({ name, email }: { name: string; email: string }) {
  const base = (name || email || '?').trim();
  const parts = base.split(/[\s.@_-]+/).filter(Boolean);
  const ini = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  return <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{ini || '?'}</div>;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/**
 * Janela de envio: escolhe o modelo, ajusta o texto e abre o WhatsApp com tudo preenchido.
 * O registro (log) é feito no clique, porque o WhatsApp não devolve confirmação de envio.
 */
export function SendModal({ user, templates, initialStage, vars, senderNumber, onClose, onSent }: {
  user: UserRow; templates: Template[]; initialStage?: StageId | null; vars: Record<string, string>;
  senderNumber: string; onClose: () => void; onSent: (stage: StageId, templateId: string, text: string) => Promise<void>;
}) {
  const toast = useToast();
  const active = templates.filter((t) => t.active);
  const [tplId, setTplId] = useState<string>(active.find((t) => t.stage === initialStage)?.id || active[0]?.id || '');
  const tpl = active.find((t) => t.id === tplId) || null;
  const [text, setText] = useState(() => (tpl ? render(tpl.body, vars) : ''));
  const [busy, setBusy] = useState(false);
  const missing = useMemo(() => (tpl ? missingVars(tpl.body, vars) : []), [tpl, vars]);
  const link = waLink(user.phone, text);

  const pick = (id: string) => {
    setTplId(id);
    const t = active.find((x) => x.id === id);
    setText(t ? render(t.body, vars) : '');
  };

  return (
    <Modal open wide onClose={onClose} title={`WhatsApp para ${user.name || user.email}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button icon={<Copy className="h-4 w-4" />} onClick={async () => { toast((await copyText(text)) ? 'Texto copiado' : 'Selecione o texto e copie manualmente', 'ok'); }}>Copiar texto</Button>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer"
            onClick={async () => { if (!tpl) return; setBusy(true); try { await onSent(tpl.stage, tpl.id, text); } finally { setBusy(false); } }}
            className={cx('inline-flex h-9 items-center gap-2 rounded-lg bg-[#1fa855] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a9049]', busy && 'opacity-60')}>
            <MessageCircle className="h-4 w-4" />Abrir no WhatsApp<ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        ) : <Button disabled>Sem celular válido</Button>}
      </>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Modelo</span>
            <select className={inputCls} value={tplId} onChange={(e) => pick(e.target.value)}>
              {active.map((t) => <option key={t.id} value={t.id}>{STAGE_BY_ID[t.stage]?.label} · {t.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Mensagem (pode ajustar antes de enviar)</span>
            <textarea rows={13} className={cx(inputCls, 'font-sans text-[13px] leading-relaxed')} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              Sem dado para: {missing.map((m) => `{${m}}`).join(', ')}. Revise o texto antes de enviar.
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Prévia para {phoneDigits(user.phone) ? `+${phoneDigits(user.phone)}` : 'sem celular'}</span>
            {senderNumber && <span>enviando de +{senderNumber}</span>}
          </div>
          <WhatsAppBubble text={text} />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            O WhatsApp abre na conta logada neste aparelho. Confira se é o número do Lyvo antes de enviar.
            O envio fica registrado no histórico ao clicar em “Abrir no WhatsApp”.
          </p>
        </div>
      </div>
    </Modal>
  );
}
