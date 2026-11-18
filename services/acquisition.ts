// Guarda de onde o visitante veio (UTM, indicação, página de entrada) na PRIMEIRA visita,
// para gravar no cadastro. Sem isso não dá para medir CAC/conversão por canal.

const KEY = 'lyvo_acq_v1';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

export type Acquisition = Record<string, string>;

export function captureAcquisition() {
  try {
    const p = new URLSearchParams(window.location.search);
    const fresh: Acquisition = {};
    UTM.forEach((k) => { const v = p.get(k); if (v) fresh[k] = v.slice(0, 120); });
    const ref = p.get('ref');
    if (ref) fresh.ref = ref.slice(0, 64);
    const stored: Acquisition = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
    // primeiro toque vence; só completa campos que ainda não existem
    const merged: Acquisition = {
      landing: stored.landing || window.location.pathname,
      referrer: stored.referrer || (document.referrer ? new URL(document.referrer).hostname : ''),
      firstSeenAt: stored.firstSeenAt || new Date().toISOString(),
      ...fresh,
      ...stored,
    };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch { /* storage bloqueado: segue sem atribuição */ }
}

export function getAcquisition(): Acquisition {
  try {
    const stored: Acquisition = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && !stored.ref) stored.ref = ref;
    return stored;
  } catch {
    const ref = new URLSearchParams(window.location.search).get('ref');
    return ref ? { ref } : {};
  }
}
