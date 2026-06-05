export async function processUserCommand(text: string, imageBase64?: string) {
  const today = new Date();
  const dateContext = `Hoje é ${today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. `;

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: dateContext + text,
      imageBase64
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    const detail = payload?.details || payload?.error || res.status;
    throw new Error(`Erro na API: ${detail}`);
  }

  return {
    message: payload.message,
    data: payload.data,
  };
}
