// api/gemini.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// (opcional) evita function “pendurar” muito tempo
export const config = { maxDuration: 20 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const { text, imageBase64 } = (req.body || {}) as { text?: string; imageBase64?: string };

    if (!text && !imageBase64) {
      return res.status(400).json({ error: "Missing text/image" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) parts.push({ text });

    if (imageBase64) {
      parts.push({
        inlineData: { data: imageBase64, mimeType: "image/jpeg" },
      });
    }

    // use o model que já funcionou no seu projeto
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts }],
    });

    const message =
      result?.text ||
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    return res.status(200).json({
      message,
      data: null, // mantém compatibilidade com seu fluxo atual
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: "Gemini processing failed",
      details: error?.message ? String(error.message) : "unknown",
    });
  }
}
