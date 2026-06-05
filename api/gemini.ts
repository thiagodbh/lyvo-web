import { GoogleGenAI, Type } from "@google/genai";

const actionSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["ADD_TRANSACTION", "ADD_CREDIT_TRANSACTION", "ADD_EVENT", "QUERY", "UNKNOWN"],
    },
    transactionDetails: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
        value: { type: Type.NUMBER },
        description: { type: Type.STRING },
        category: { type: Type.STRING },
        cardName: { type: Type.STRING },
        installments: { type: Type.NUMBER },
        date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
      },
    },
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        time: { type: Type.STRING, description: "HH:mm" },
        description: { type: Type.STRING },
      },
    },
    responseMessage: { type: Type.STRING },
  },
  required: ["action", "responseMessage"],
};

const systemInstruction = `Você é o assistente financeiro do Lyvo. Analise o comando do usuário e retorne JSON estruturado.
- Para registrar despesas/receitas: use ADD_TRANSACTION com transactionDetails
- Para compras no cartão de crédito: use ADD_CREDIT_TRANSACTION com transactionDetails e cardName
- Para eventos na agenda: use ADD_EVENT com eventDetails
- Para perguntas/consultas: use QUERY
- Para comandos não reconhecidos: use UNKNOWN
- Datas sempre no formato YYYY-MM-DD
- Valores numéricos sem símbolos de moeda
- responseMessage deve ser uma resposta amigável em português confirmando a ação`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const { text, imageBase64 } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) {
      parts.push({ text });
    }

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: actionSchema,
      },
    });

    const raw = response.text ?? "";

    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json({
        message: parsed.responseMessage || "Comando processado.",
        data: parsed,
      });
    } catch {
      console.error("Erro de parse do JSON:", raw);
      return res.status(200).json({
        message: "Houve uma oscilação ao interpretar o comando. Tente novamente.",
        data: { action: "UNKNOWN" },
      });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = String(error?.message || error);
    return res.status(500).json({
      error: "Gemini processing failed",
      details: errorMessage,
    });
  }
}
