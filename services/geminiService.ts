import { saveTransaction } from "./dataService";
import { saveEvent } from "./agendaService";

type GeminiAction =
  | "ADD_TRANSACTION"
  | "ADD_CREDIT_TRANSACTION"
  | "ADD_EVENT"
  | "QUERY"
  | "UNKNOWN";

interface GeminiPayload {
  action: GeminiAction;
  transactionDetails?: any;
  eventDetails?: any;
}

export async function processUserCommand(payload: GeminiPayload) {
  switch (payload.action) {
    case "ADD_TRANSACTION": {
      await saveTransaction(payload.transactionDetails);
      return {
        message: "Transação registrada com sucesso.",
        data: payload.transactionDetails,
      };
    }

    case "ADD_CREDIT_TRANSACTION": {
      await saveTransaction({
        ...payload.transactionDetails,
        isCredit: true,
      });
      return {
        message: "Transação no cartão registrada com sucesso.",
        data: payload.transactionDetails,
      };
    }

    case "ADD_EVENT": {
      await saveEvent(payload.eventDetails);
      return {
        message: "Evento adicionado à agenda.",
        data: payload.eventDetails,
      };
    }

    case "QUERY": {
      return {
        message: "Consulta recebida.",
        data: payload,
      };
    }

    default:
      return {
        message: "Não entendi o comando.",
        data: payload.data, // <- importante!
      };
  }
}
