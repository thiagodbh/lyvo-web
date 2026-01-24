// services/geminiService.ts

if (import.meta.env.DEV) {
  console.log("ENV GEMINI:", import.meta.env.VITE_GEMINI_API_KEY);
}

export async function processUserCommand(text: string, imageBase64?: string) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, imageBase64 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erro ao processar Gemini: ${res.status} ${errText}`);
  }

  const data = await res.json();

  return {
    message: data.message,
    data: data.data ?? null,
  };
}
