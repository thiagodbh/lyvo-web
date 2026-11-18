#!/usr/bin/env bash
# Publica o front novo (Vercel publica sozinho ao receber push no main).
# Só rode DEPOIS de scripts/deploy-backend.sh ter terminado com sucesso.
#   bash scripts/publish-front.sh
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

say "Conferindo se o backend já está no ar"
command -v firebase >/dev/null || fail "Firebase CLI não encontrado. Rode antes: bash scripts/deploy-backend.sh"
fns=$(firebase functions:list --project lyvo-web 2>/dev/null || true)
for f in adminApi billingWebhook olimpoCheckout olimpoSyncMine; do
  echo "$fns" | grep -q "$f" || fail "Function '$f' não está publicada. Rode antes: bash scripts/deploy-backend.sh"
done
echo "Functions OK."

say "Enviando o branch e juntando no main"
git fetch origin
git checkout feat/admin-v2
git push -u origin feat/admin-v2
git checkout main
git pull --ff-only origin main
# só os arquivos do projeto; lockfiles e dist/ locais ficam como estão
git merge --no-ff feat/admin-v2 -m "merge: admin v2 + Olimpo Pay (principal) + LastLink (fallback)"

say "Publicando (push no main → Vercel)"
git push origin main

printf "\n\033[1;32m✔ Front enviado. A Vercel publica em 1–3 minutos.\033[0m\n"
echo "Depois abra https://meulyvo.com/?view=admin e entre com o e-mail de admin."
echo "Se algo der errado: git revert -m 1 HEAD && git push origin main (volta o front anterior)."
