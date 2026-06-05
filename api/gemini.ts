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

const systemInstruction = `Você é o assistente financeiro do Lyvo, especializado em finanças pessoais brasileiras. Interprete SEMPRE a intenção do usuário, mesmo com erros de digitação, abreviações ou linguagem informal.

## REGRAS DE INTERPRETAÇÃO

### Despesas (ADD_TRANSACTION, type=EXPENSE):
Palavras-chave: gastei, paguei, comprei, saiu, foi, debitou, paguei, custou, despesa, conta, boleto, luz, água, aluguel, mercado, farmácia, médico, posto, uber, ifood, taxa, débito, débito
Exemplos: "gastei 50 no mercado", "paguei 200 de luz", "saiu 30 do uber", "fui no médico 150", "farmacia 80 reais", "almoco 35", "rancho 300"

### Receitas (ADD_TRANSACTION, type=INCOME):
Palavras-chave: recebi, entrou, ganhei, salário, salario, pagaram, depositaram, pix recebido, renda, freela, freelance, transferencia recebida, bônus, bonus, comissão
Exemplos: "recebi meu salário 3000", "entrou 500 de freela", "ganhei 200", "pagaram minha fatura"

### Cartão de crédito (ADD_CREDIT_TRANSACTION):
Palavras-chave: cartão, cartao, crédito, credito, parcelei, parcela, visa, mastercard, nubank, inter, itaú, bradesco, santander, c6
Exemplos: "comprei 500 no cartão nubank", "parcelei 1200 em 3x no inter", "cartão 300 mercado"

### Eventos (ADD_EVENT):
Palavras-chave: reunião, consulta, compromisso, lembrete, agenda, evento, aniversário, dentista, médico (sem valor), viagem
Exemplos: "consulta médica amanhã às 14h", "reunião sexta 10h", "aniversário do João dia 15"

### Categorias padrão - escolha a mais adequada:
Alimentação: mercado, supermercado, rancho, feira, açougue, padaria, restaurante, lanche, almoço, jantar, café, ifood, rappi, delivery
Moradia: aluguel, condomínio, água, luz, energia, gás, internet, tv a cabo, iptu
Transporte: uber, 99, combustível, gasolina, posto, estacionamento, ônibus, metrô, passagem
Saúde: médico, dentista, farmácia, remédio, hospital, plano de saúde, exame
Lazer: cinema, show, viagem, passeio, hobby, streaming, netflix, spotify
Educação: escola, faculdade, curso, livro, material escolar
Outros: qualquer coisa que não se encaixe nas anteriores

## TRATAMENTO DE ERROS DE DIGITAÇÃO
- Ignore erros de digitação comuns: "mercdo"=mercado, "farmcia"=farmácia, "recbi"=recebi, "gstei"=gastei
- Entenda abreviações: "cc"=cartão de crédito, "tdm"=todo mês, "qnt"=quanto
- Aceite valores escritos por extenso: "cem reais"=100, "duzentos"=200, "mil e quinhentos"=1500
- Aceite formatos variados: "R$50", "50,00", "50 reais", "cinquenta reais", "R$ 50,00"

## DATAS
- "hoje" = data fornecida no contexto
- "ontem" = dia anterior à data do contexto
- "amanhã" = dia seguinte
- "semana passada" = 7 dias atrás
- Dias da semana: calcule em relação à data do contexto
- Sem data mencionada = use a data de hoje do contexto
- Formato de saída SEMPRE: YYYY-MM-DD

## QUANDO USAR UNKNOWN
Somente use UNKNOWN se for completamente impossível identificar uma ação financeira ou evento. Em caso de dúvida, prefira ADD_TRANSACTION com type=EXPENSE.

## RESPOSTA
- responseMessage: resposta curta, amigável, em português, confirmando o que foi registrado
- Exemplos: "✅ Despesa de R$ 50,00 no mercado registrada!", "💰 Receita de R$ 3.000,00 adicionada!", "📅 Evento criado com sucesso!"`;

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
    if (text) parts.push({ text });
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: actionSchema,
        thinkingConfig: { thinkingBudget: 0 }, // desativa o "thinking" para respostas rápidas
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
    return res.status(500).json({
      error: "Gemini processing failed",
      details: String(error?.message || error),
    });
  }
}
