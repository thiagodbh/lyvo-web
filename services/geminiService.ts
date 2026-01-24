// services/geminiService.ts
if (import.meta.env.DEV) console.log('ENV GEMINI:', import.meta.env.VITE_GEMINI_API_KEY);

type GeminiResponse = {
  message: string;
  data: any | null;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

export async function processUserCommand(text: string, imageBase64?: string) {
  const payload = { text, imageBase64 };

  const doRequest = async () => {
    const res = await fetchWithTimeout(
      "/api/gemini",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      15000
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Erro ao processar Gemini: ${res.status} ${errText}`);
    }

    const data: GeminiResponse = await res.json();

    return {
      message: data.message,
      data: data.data ?? null,
    };
  };

  try {
    // tentativa 1
    return await doRequest();
  } catch (e: any) {
    // retry 1x (se for timeout/instabilidade)
    const msg = String(e?.message || e);

    const isRetryable =
      msg.includes("AbortError") ||
      msg.includes("Failed to fetch") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("500");

    if (!isRetryable) {
      return {
        message: "Tive um problema técnico ao processar isso. Tenta de novo?",
        data: { action: "UNKNOWN" },
      };
    }

    try {
      return await doRequest();
    } catch {
      return {
        message: "Ainda não consegui acessar a IA agora. Tenta novamente em alguns instantes.",
        data: { action: "UNKNOWN" },
      };
    }
  }
}
