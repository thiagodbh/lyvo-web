// Categorias: encaixe da sugestão da IA nas categorias reais do usuário (módulo puro, testável).
export const INCOME_CATEGORIES = ["Salário", "Freela", "Comissão", "Outros"];

const normCat = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Encaixa a categoria sugerida pela IA numa categoria que existe para o usuário.
 * Ordem: igual → contém/contido → primeira palavra igual → "Outros" → primeira da lista.
 */
export function pickCategory(suggested: string | undefined, options: string[]): string {
  const opts = options.filter(Boolean);
  if (!opts.length) return suggested || "Outros";
  const s = normCat(suggested);
  if (s) {
    const exact = opts.find((o) => normCat(o) === s);
    if (exact) return exact;
    const part = opts.find((o) => normCat(o).includes(s) || s.includes(normCat(o)));
    if (part) return part;
    const w = s.split(" ")[0];
    const word = opts.find((o) => normCat(o).split(" ")[0] === w);
    if (word) return word;
  }
  return opts.find((o) => normCat(o) === "outros") || opts[0];
}
