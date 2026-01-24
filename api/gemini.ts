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

    const response = await ai.models.generateContent({
      // ✅ modelo válido (use um destes)
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: actionSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw = response.text || "{}";
    const parsed = JSON.parse(raw);

    return res.status(200).json({
      message: parsed.responseMessage || "Ok.",
      data: parsed,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error?.message || error);
    return res.status(500).json({ error: "Gemini processing failed", details: String(error?.message || error) });
  }
}
