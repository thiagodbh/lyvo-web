import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, imageBase64 } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const parts: any[] = [];

    if (text) {
      parts.push({ text });
    }

    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const responseText =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      message: responseText,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Gemini processing failed" });
  }
}
