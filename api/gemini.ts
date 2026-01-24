import { GoogleGenAI, Type } from "@google/genai";
import { processUserCommand } from "./geminiService";

const actionSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: [
        "ADD_TRANSACTION",
        "ADD_CREDIT_TRANSACTION",
        "ADD_EVENT",
        "QUERY",
        "UNKNOWN",
      ],
    },
    transactionDetails: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
        value: { type: Type.NUMBER },
        description: { type: Type.STRING },
        date: { type: Type.STRING },
        category: { type: Type.STRING },
        relatedCardId: { type: Type.STRING },
      },
      nullable: true,
    },
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        dateTime: { type: Type.STRING },
      },
      nullable: true,
    },
  },
};

export default async function handler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem não enviada" }),
        { status: 400 }
      );
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: actionSchema,
      },
    });

    const result = await model.generateContent(message);
    const parsed = JSON.parse(result.response.text());

    const payload = await processUserCommand(parsed);

    return new Response(
      JSON.stringify({
        success: true,
        data: payload,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Gemini processing failed",
        details: String(error?.message || error),
      }),
      { status: 500 }
    );
  }
}
