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
      nullable: true,
    },
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        time: { type: Type.STRING, description: "HH:mm" },
        description: { type: Type.STRING },
      },
      nullable: true,
    },
    responseMessage: { type: Type.STRING },
  },
  required: ["action", "responseMessage"],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { text, imageBase64 } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) parts.push({ text });
    if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

    // ✅ Alterado para o modelo estável 2.0-flash (mais rápido e barato)
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: actionSchema,
      },
    });

    // PEGA O TEXTO BRUTO: Adicionamos uma verificação de segurança
    const raw = response.text || "{}";
    
    try {
        // Tenta transformar o texto da IA em dados para o App
        const parsed = JSON.parse(raw);
        
        return res.status(200).json({
          message: parsed.responseMessage || "Comando processado.",
          data: parsed,
        });
    } catch (parseError) {
        // Se a IA "engasgar" e mandar um texto quebrado, o App não trava mais
        console.error("Erro de Sintaxe na Resposta da IA:", raw);
        return res.status(200).json({ 
            message: "Entendi o seu comando, mas houve uma oscilação na rede. Pode repetir de forma mais curta?",
            data: { action: "UNKNOWN" } 
        });
    }
