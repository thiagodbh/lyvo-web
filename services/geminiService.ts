// services/geminiService.ts

// (opcional) só pra debug em DEV
if (import.meta.env.DEV) console.log("ENV GEMINI:", import.meta.env.VITE_GEMINI_API_KEY);

export async function processUserCommand(text: string, imageBase64?: string) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, imageBase64 }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Erro ao processar Gemini: ${res.status} ${raw}`);
  }

  const data = JSON.parse(raw);

  return {
    message: data.message ?? "",
    data: null, // mantém compatibilidade com seu fluxo atual
  };
}
