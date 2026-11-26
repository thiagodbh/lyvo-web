import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { X, Check, KeyRound } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { useHideValues } from '../services/privacy';

export const INCOME_RANGES = [
  { value: 'Até 3k', label: 'Até R$ 3.000' },
  { value: '3k-7k', label: 'R$ 3.001 a R$ 7.000' },
  { value: '7k-15k', label: 'R$ 7.001 a R$ 15.000' },
  { value: '15k-30k', label: 'R$ 15.001 a R$ 30.000' },
  { value: 'Acima 30k', label: 'Acima de R$ 30.000' },
];
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

type Profile = { name: string; phone: string; birthDate: string; city: string; state: string; profession: string; income: string; whatsappOptIn: boolean };
const EMPTY: Profile = { name: '', phone: '', birthDate: '', city: '', state: '', profession: '', income: '', whatsappOptIn: false };

/** Máscara de celular: (31) 99999-9999 */
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export default function ProfileSettings({ onClose, onSaved }: { onClose: () => void; onSaved?: (p: Profile) => void }) {
  const uid = auth.currentUser?.uid;
  const email = auth.currentUser?.email || '';
  const [p, setP] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [hideValues, toggleHide] = useHideValues();

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((s) => {
      const d: any = s.data() || {};
      setP({
        name: d.name || '', phone: d.phone ? maskPhone(d.phone) : '', birthDate: d.birthDate || '', city: d.city || '',
        state: d.state || '', profession: d.profession || '', income: d.income || '', whatsappOptIn: d.whatsappOptIn === true,
      });
    }).catch(() => setMsg({ ok: false, text: 'Não consegui carregar seus dados.' })).finally(() => setLoading(false));
  }, [uid]);

  const set = (k: keyof Profile) => (e: any) => setP({ ...p, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value });
  const phoneDigits = p.phone.replace(/\D/g, '');
  const phoneInvalid = phoneDigits.length > 0 && phoneDigits.length < 10;

  const save = async () => {
    if (!uid) return;
    if (!p.name.trim()) { setMsg({ ok: false, text: 'Preencha seu nome.' }); return; }
    if (phoneInvalid) { setMsg({ ok: false, text: 'Celular incompleto: use DDD + número.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const clean = (s: string, n = 120) => s.trim().slice(0, n);
      await updateDoc(doc(db, 'users', uid), {
        name: clean(p.name), phone: phoneDigits, birthDate: clean(p.birthDate, 10), city: clean(p.city),
        state: clean(p.state, 2).toUpperCase(), profession: clean(p.profession), income: clean(p.income, 30),
        whatsappOptIn: p.whatsappOptIn,
      });
      setMsg({ ok: true, text: 'Dados salvos.' });
      onSaved?.(p);
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Não consegui salvar agora. Tente de novo.' });
    } finally { setSaving(false); }
  };

  const reset = async () => {
    try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
    catch { setMsg({ ok: false, text: 'Não consegui enviar o e-mail de troca de senha.' }); }
  };

  const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-lyvo-primary focus:bg-white';
  const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Configurações</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>

        {loading ? <p className="p-6 text-sm text-gray-500">Carregando…</p> : (
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-gray-800">Seus dados</h4>
              <div><label className={label}>Nome</label><input className={input} value={p.name} onChange={set('name')} placeholder="Como você quer ser chamado" autoComplete="name" /></div>
              <div><label className={label}>E-mail</label><input className={`${input} text-gray-400`} value={email} disabled /></div>
              <div>
                <label className={label}>Celular (WhatsApp)</label>
                <input className={input} value={p.phone} onChange={set('phone')} placeholder="(31) 99999-9999" inputMode="tel" autoComplete="tel" />
                {phoneInvalid && <p className="mt-1 text-xs text-red-500">Use DDD + número.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Nascimento</label><input type="date" className={input} value={p.birthDate} onChange={set('birthDate')} /></div>
                <div><label className={label}>Profissão</label><input className={input} value={p.profession} onChange={set('profession')} /></div>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <div><label className={label}>Cidade</label><input className={input} value={p.city} onChange={set('city')} autoComplete="address-level2" /></div>
                <div><label className={label}>UF</label>
                  <select className={input} value={p.state} onChange={set('state')}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
                </div>
              </div>
              <div><label className={label}>Renda mensal média</label>
                <select className={input} value={p.income} onChange={set('income')}>
                  <option value="">Prefiro não informar</option>
                  {INCOME_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-bold text-gray-800">Preferências</h4>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-600" checked={p.whatsappOptIn} onChange={(e) => setP({ ...p, whatsappOptIn: e.target.checked })} />
                <span className="text-sm text-gray-700"><b>Receber avisos pelo WhatsApp</b><br /><span className="text-xs text-gray-500">Lembretes de vencimento, fim do teste e novidades. Dá para desligar quando quiser.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-600" checked={hideValues} onChange={toggleHide} />
                <span className="text-sm text-gray-700"><b>Abrir Finanças com valores ocultos</b><br /><span className="text-xs text-gray-500">Mesmo efeito do olhinho 👁 em Finanças. Vale para este aparelho.</span></span>
              </label>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-bold text-gray-800">Segurança</h4>
              <button onClick={reset} disabled={resetSent || !email}
                className="flex w-full items-center gap-2 rounded-xl border border-gray-200 p-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70">
                <KeyRound className="h-4 w-4" />
                {resetSent ? `Enviamos um link para ${email}` : 'Trocar minha senha'}
              </button>
            </section>
          </div>
        )}

        <div className="space-y-2 border-t border-gray-100 px-6 py-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          {msg && <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.ok && <Check className="h-4 w-4" />}{msg.text}</p>}
          <button onClick={save} disabled={saving || loading}
            className="w-full rounded-xl bg-lyvo-primary py-3.5 font-bold text-white hover:bg-lyvo-dark disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
