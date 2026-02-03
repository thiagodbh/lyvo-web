export async function processUserCommand(text: string, imageBase64?: string) {
  // AJUSTE: Captura a data exata de hoje para enviar à IA
  const today = new Date();
  const dateContext = `Hoje é ${today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. `;

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Adicionamos o dateContext antes do texto do usuário
    body: JSON.stringify({ 
      text: dateContext + text, 
      imageBase64 
    }),
  });

  const payload = await res.json();
  if (!res.ok) throw new Error(`Erro ao processar Gemini: ${res.status} ${JSON.stringify(payload)}`);

  return {
    message: payload.message,
    data: payload.data, // <- importante!
  };
}
