# Admin v2 + billing multi-gateway: roteiro de implantação

Branch: `feat/admin-v2`. Nada disto está no ar até seguir os passos abaixo.

## Como avaliar antes (sem tocar em produção)

```bash
npm install
npm run dev
# abra: http://localhost:3000/?view=admin&demo=1
```

`demo=1` usa dados fictícios em memória: nada é lido nem gravado no Firebase.
O modo demo só existe em `npm run dev` (ou build com `VITE_ADMIN_DEMO=1`); em produção ele não abre.

## O que muda

- **Painel admin novo** (`components/admin/`): visão geral (MRR, receita, conversão, churn, funil, aquisição),
  usuários (ficha completa + ações), assinaturas/renovações, pagamentos (ledger + vincular pagamento),
  planos, gateways (fallback), auditoria.
- **Admin protegido de verdade**: só abre com login + permissão checada no servidor (`adminApi`).
- **Billing multi-gateway** (`functions/src/billing/`): LastLink, Kiwify, Hotmart, Cakto traduzidos para
  um formato único. Webhook com token, idempotente, com ledger (`billingEvents`), assinaturas
  (`subscriptions`) e acesso pendente para quem paga antes de criar conta (`pendingAccess`).
- **Fallback de checkout**: o paywall lê `config/billing` e usa o 1º gateway habilitado com link.
- **Correções de dados**: o perfil do cadastro agora é salvo (antes nunca era), origem (UTM/indicação)
  gravada, atividade registrada de verdade, “Esqueci minha senha” funcionando.
- **Regras do Firestore** (`firestore.rules`): antes não existia arquivo no repositório.

## Olimpo Pay (gateway principal) e LastLink (fallback)

- **Checkout:** o servidor cria uma assinatura na Olimpo Pay (`POST /v2/subscriptions/create`) e manda o cliente
  para o `paymentLink` hospedado (Pix ou cartão). Nenhum dado de cartão passa pelo Lyvo. O cliente informa
  CPF e celular no paywall; o CPF não é salvo no Lyvo.
- **Liberação de acesso:** a API de assinatura não aceita URL de webhook, e o webhook da Olimpo não é assinado
  nem reenviado. Então o acesso é decidido consultando `GET /v2/subscriptions/me?id=` (status, último pagamento,
  próxima cobrança): a cada 15 min, quando o cliente clica “Verificar meu pagamento” e quando volta da página de
  pagamento. O acesso vai até a próxima cobrança + 1 dia (+ carência se atrasar).
- **Fallback automático:** se a Olimpo falhar na hora de gerar a cobrança, o paywall oferece o link da LastLink.
- **Cancelamento:** pela ficha do usuário no admin (`POST /v2/subscriptions/cancel`); o acesso segue até o fim do período.

## Ordem de implantação

0. **Chave da Olimpo Pay (você mesmo, no terminal):** `firebase functions:secrets:set OLIMPO_API_KEY`
   e cole a chave quando pedir. Sem ela o deploy das functions falha (elas declaram esse secret).


1. **Testar as regras antes de publicar.** No console do Firebase → Firestore → Regras → *Rules Playground*,
   simule com um usuário comum: ler o próprio `users/{uid}` (deve permitir), ler o de outro (negar),
   alterar o próprio `active`/`access` (negar), criar `transactions` com o próprio uid (permitir).
   Se possível, rode o app no emulador com as regras novas e use cada tela uma vez.
2. **Definir quem é admin.** No deploy das functions o Firebase vai pedir `ADMIN_EMAILS`:
   informe seu e-mail (vários separados por vírgula). Depois dá para promover outros pelo painel.
3. **Deploy das functions:** `firebase deploy --only functions`
4. **Deploy das regras:** `firebase deploy --only firestore:rules`
   (adicione `"firestore": { "rules": "firestore.rules" }` no `firebase.json` se o CLI reclamar)
5. **Deploy do front** (onde o meulyvo.com é publicado hoje).
6. **No painel → Auditoria → “Recalcular uso”** (preenche os contadores de quem já existia).
7. **No painel → Gateways → LastLink → “Gerar URL do webhook”**, cole essa URL no painel da LastLink
   no lugar da antiga. Faça uma compra de teste (ou um evento de teste da LastLink) e confira em Pagamentos.
8. Quando um evento chegar pela URL nova, **desligue o “Webhook antigo da LastLink”** na mesma tela.
9. **Planos:** cadastre os IDs de produto/oferta da LastLink em cada plano (copie do payload em
   Pagamentos → Detalhes). Sem eles o sistema identifica pelo intervalo/valor, o que funciona,
   mas ID é mais seguro.
10. **Olimpo Pay em produção:** Admin → Gateways → “Testar conexão com a API”. Faça uma assinatura real de
    R$ 24,90 com seu próprio CPF, pague no Pix, clique “Verificar meu pagamento” e confira em Pagamentos.
    Depois cancele pela sua ficha no admin e marque “Validado em produção”.
11. **Gateway reserva (ex.: Kiwify):** crie os produtos lá, cole os links de checkout em Planos,
    gere a URL do webhook, mande um evento de teste, use “Testar payload” para conferir e só então
    marque “Mapeamento validado”.

## Pontos a validar com dados reais

- **Olimpo Pay (confirmar com o time técnico):** (1) se existe webhook para a fatura recorrente e onde se configura;
  (2) se o link da assinatura anual permite parcelar no cartão (o paywall não promete parcelas quando a Olimpo é a principal);
  (3) o fuso das datas `ultimo_pagamento`/`proxima_cobranca` (assumi horário de Brasília); (4) se existe chave de sandbox.

- Formato dos webhooks de **Kiwify, Hotmart e Cakto** foi montado com documentação pública parcial.
  O da LastLink segue a documentação oficial. Por isso os três começam “não validados”.
- O valor da Kiwify (`Commissions.charge_amount`) foi tratado como centavos. Confirme no primeiro evento real.
- Usuários antigos ativados pelo webhook velho (`active: true` sem `access`) continuam com acesso sem prazo.
  Revise-os em Usuários → filtro “Ativo” e ajuste o vencimento manualmente se quiser.

## Reverter

O branch é isolado. Se não aprovar: `git checkout main && git branch -D feat/admin-v2`.
Se já tiver feito deploy: volte o webhook da LastLink para a URL antiga (o endpoint antigo continua
existindo enquanto “Webhook antigo” estiver ligado) e faça deploy do `main`.
