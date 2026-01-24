import { GoogleGenAI } from "@google/genai";

export const config = { maxDuration: 20 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { text, imageBase64 } = req.body || {};
    if (!text && !imageBase64) return res.status(400).json({ error: "Missing text/image" });

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) parts.push({ text });
    if (imageBase64) parts.push({ inlineData: { data: imageBase64, mimeType: "image/jpeg" } });

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts }],
    });

    const message = result?.text || "";

    return res.status(200).json({ message, data: null });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Gemini processing failed", details: String(error?.message || error) });
  }
}
