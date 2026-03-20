import { GoogleGenerativeAI } from "@google/generative-ai";
import { Type } from "@google/genai";

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

    // 1. Inicializa a biblioteca oficial (estrada de produção v1)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 2. Configura o modelo e a inteligência (actionSchema)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    }, { apiVersion: 'v1' });

    const promptReforce = "\nResponda estritamente em JSON seguindo este esquema: " + JSON.stringify(actionSchema);
    const parts: any[] = [];
    if (text) parts.push({ text: text + promptReforce });
    if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

    // 3. Executa a chamada oficial para contas pagas
    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = await result.response;
    const raw = response.text();

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
  } catch (error: any) { 
    // ✅ ESTE BLOCO FECHA O TRY GERAL DO INÍCIO DO ARQUIVO
    console.error("Gemini API Error:", error?.message || error);
    return res.status(500).json({ 
        error: "Gemini processing failed", 
        details: String(error?.message || error) 
    });
  }
}
