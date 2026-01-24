export async function processUserCommand(text: string, imageBase64?: string) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, imageBase64 }),
  });

  const payload = await res.json();
  if (!res.ok) throw new Error(`Erro ao processar Gemini: ${res.status} ${JSON.stringify(payload)}`);

  return {
    message: payload.message,
    data: payload.data, // <- importante!
  };
}
