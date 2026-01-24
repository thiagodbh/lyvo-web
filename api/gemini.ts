import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, imageBase64 } = (req.body ?? {}) as {
      text?: string;
      imageBase64?: string;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) parts.push({ text });

    if (imageBase64) {
      parts.push({
        inlineData: { mimeType: "image/jpeg", data: imageBase64 },
      });
    }

    const resp = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts }],
    });

    return res.status(200).json({
      message: resp.text ?? "",
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: "Gemini processing failed",
      details: error?.message ?? String(error),
    });
  }
}
