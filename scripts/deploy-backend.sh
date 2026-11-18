#!/usr/bin/env bash
# Deploy do backend do Lyvo (admin v2 + billing Olimpo Pay/LastLink).
# Rode no Terminal, dentro da pasta do projeto:  bash scripts/deploy-backend.sh
# Ele só publica as Cloud Functions. Front (Vercel) e regras do Firestore vêm depois.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

say "Conferindo ferramentas"
command -v node >/dev/null || fail "Node.js não encontrado. Instale em https://nodejs.org"
if ! command -v firebase >/dev/null; then
  echo "Firebase CLI não encontrado. Instalando (npm i -g firebase-tools)…"
  npm i -g firebase-tools || fail "Não consegui instalar. Rode: sudo npm i -g firebase-tools"
  export PATH="$(npm prefix -g)/bin:$PATH"
  command -v firebase >/dev/null || fail "Firebase instalado, mas fora do PATH. Rode: export PATH=\"\$(npm prefix -g)/bin:\$PATH\" e tente de novo"
fi

branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$branch" == "feat/admin-v2" || "$branch" == "main" ]] || fail "Você está no branch '$branch'. Rode: git checkout feat/admin-v2"
grep -q "olimpoCheckout" functions/src/index.ts || fail "Este branch não tem a integração Olimpo Pay."

say "Login no Firebase"
if ! firebase login:list 2>/dev/null | grep -q "@"; then firebase login; fi
firebase use lyvo-web >/dev/null

say "E-mail(s) com acesso ao painel admin"
touch functions/.env
if grep -q "^ADMIN_EMAILS=" functions/.env; then
  echo "Já configurado: $(grep '^ADMIN_EMAILS=' functions/.env | cut -d= -f2)"
else
  read -r -p "Digite o e-mail que você usa para entrar no Lyvo (vários separados por vírgula): " ADMIN
  [[ "$ADMIN" == *"@"* ]] || fail "E-mail inválido"
  echo "ADMIN_EMAILS=$ADMIN" >> functions/.env
fi

say "Chave da API da Olimpo Pay (secret OLIMPO_API_KEY)"
if firebase functions:secrets:get OLIMPO_API_KEY >/dev/null 2>&1; then
  echo "Secret já existe. (Para trocar: firebase functions:secrets:set OLIMPO_API_KEY)"
else
  echo "Cole a chave quando pedir. Ela não aparece na tela e fica só no Google Secret Manager."
  firebase functions:secrets:set OLIMPO_API_KEY
fi

say "Instalando dependências e compilando"
(cd functions && npm install --no-audit --no-fund && npm run build)

say "Publicando as Cloud Functions (pode levar alguns minutos)"
firebase deploy --only functions

printf "\n\033[1;32m✔ Backend no ar.\033[0m\n"
echo "Próximo passo: volte ao Claude e diga \"functions ok\" para publicar o front e configurar o resto."
