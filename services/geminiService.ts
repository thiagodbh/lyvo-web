
import { GoogleGenAI, Type } from "@google/genai";
import { store } from "./mockStore";

// NÃO pode usar process.env no frontend (browser). Vite usa import.meta.env.
// Aqui a gente só evita crash. O Gemini “real” vai para /api na Fase 3.
const getAi = () => {
  const apiKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

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
        date: { type: Type.STRING, description: "Formato YYYY-MM-DD" }
      }
    },
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        date: { type: Type.STRING, description: "Data do evento no formato YYYY-MM-DD" },
        time: { type: Type.STRING, description: "Hora do evento no formato HH:mm" },
        description: { type: Type.STRING }
      }
    },
    responseMessage: {
      type: Type.STRING,
      description: "Resumo da ação realizada em português."
    }
  },
  required: ["action", "responseMessage"]
};

/**
 * Sanitizes and extracts JSON from the model response.
 */
const extractJson = (str: string): string => {
  let cleaned = str.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && firstOpen < lastClose) {
    return cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned;
};

/**
 * Process natural language commands using Gemini.
 * Uses thinkingBudget: 0 to ensure stability.
 */
export const processUserCommand = async (inputText: string, imageBase64?: string) => {
  try {
    const parts: any[] = [{ text: inputText }];
    if (imageBase64) {
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
      });
    }

    const cardNames = store.creditCards.map(c => c.name).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `
          Você é o Lyvo, assistente de finanças e agenda de elite.
          Extraia dados estruturados. DATA ATUAL (GMT-3 São Paulo): ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
          CARTÕES DISPONÍVEIS: ${cardNames}.
          
          CATEGORIAS DE DESPESA: Alimentação, Moradia, Transporte, Saúde, Lazer, Outros.
          CATEGORIAS DE RECEITA: Salário, Freela, Comissão, Outros.
          
          REGRAS DE CLASSIFICAÇÃO:
          - Se houver uma imagem de recibo/comprovante, sua PRIORIDADE é extrair o valor total e descrição.
          - 'ADD_EVENT': compromisso, reunião ou agendamento. OBRIGATÓRIO extrair 'date' (YYYY-MM-DD) e 'time' (HH:mm). Se o usuário disser 'amanhã', 'hoje' ou 'próxima segunda', use a DATA ATUAL para calcular o dia exato.
          - 'ADD_CREDIT_TRANSACTION': menção a cartão, crédito ou parcelas.
          - 'ADD_TRANSACTION': receitas ou despesas via PIX/Dinheiro.
          
          IMPORTANTE:
          - No campo 'responseMessage', retorne uma frase amigável confirmando o que entendeu.
          - NÃO retorne explicações, APENAS o JSON no formato solicitado.
          - Use o fuso horário GMT-3 para todas as interpretações de datas relativas.
        `,
        responseMimeType: "application/json",
        responseSchema: actionSchema
      }
    });

    const rawText = response.text || "{}";
    const cleanJson = extractJson(rawText);
    const parsedResult = JSON.parse(cleanJson);
    
    return { 
      success: true, 
      data: parsedResult, 
      message: parsedResult.responseMessage || "Processado com sucesso." 
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { success: false, data: { action: 'UNKNOWN' }, message: "Erro no processamento. Tente novamente." };
  }
};
