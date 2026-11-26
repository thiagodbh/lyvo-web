// "Olhinho" de privacidade: esconde os valores em Finanças, como em app de banco.
// A escolha fica guardada no aparelho: se o usuário deixou oculto, o app já abre oculto.
import { useEffect, useState } from 'react';

const KEY = 'lyvo_hide_values';
const EVENT = 'lyvo:privacy';
export const MASK = 'R$ ••••';

export function isHidden(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setHidden(v: boolean) {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* modo anônimo: vale só nesta sessão */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

/** [oculto?, alternar] — todos os componentes que usam o hook mudam juntos. */
export function useHideValues(): [boolean, () => void] {
  const [hidden, setH] = useState<boolean>(isHidden());
  useEffect(() => {
    const on = (e: Event) => setH(typeof (e as CustomEvent).detail === 'boolean' ? (e as CustomEvent).detail : isHidden());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [hidden, () => { setH(!hidden); setHidden(!hidden); }];
}

export function brl(v: number, hidden = false): string {
  if (hidden) return MASK;
  const safe = isNaN(v) || !isFinite(v) ? 0 : v;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safe);
}
