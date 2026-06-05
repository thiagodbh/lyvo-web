export async function processUserCommand(text: string, imageBase64?: string) {
  const today = new Date();
  const dateContext = `Hoje é ${today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. `;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: dateContext + text, imageBase64 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const payload = await res.json();
    if (!res.ok) {
      const detail = payload?.details || payload?.error || res.status;
      throw new Error(`Erro na API: ${detail}`);
    }

    return { message: payload.message, data: payload.data };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite excedido. Tente novamente.');
    }
    throw err;
  }
}
