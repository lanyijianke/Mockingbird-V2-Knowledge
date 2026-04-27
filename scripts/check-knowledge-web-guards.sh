#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v rg >/dev/null 2>&1; then
  echo "[kw-guard] ripgrep (rg) is required but not installed."
  exit 1
fi

cd "$REPO_ROOT"

echo "[kw-guard] 1/3 checking dangerous markdown HTML flags..."
dangerous_html_matches="$(rg -n "allowDangerousHtml\\s*:\\s*true" app lib || true)"
if [[ -n "$dangerous_html_matches" ]]; then
  echo "[kw-guard][violation] found allowDangerousHtml: true"
  echo "$dangerous_html_matches"
  exit 1
fi

echo "[kw-guard] 2/3 checking admin auth guard on management POST routes..."
for route_file in \
  "app/api/jobs/route.ts" \
  "app/api/logs/route.ts"
do
  if [[ ! -f "$route_file" ]]; then
    echo "[kw-guard][violation] missing route file: $route_file"
    exit 1
  fi

  if ! rg -q "verifyAdminHeaders" "$route_file"; then
    echo "[kw-guard][violation] admin auth guard missing in $route_file"
    exit 1
  fi
done

echo "[kw-guard] 3/3 checking sanitizeExternalUrl usage on key external-link pages..."
for page_file in \
  "app/prompts/[id]/PromptDetailClient.tsx" \
  "app/rankings/github/page.tsx" \
  "app/rankings/producthunt/page.tsx" \
  "app/rankings/skills-trending/page.tsx" \
  "app/rankings/skills-hot/page.tsx"
do
  if [[ ! -f "$page_file" ]]; then
    echo "[kw-guard][violation] missing page file: $page_file"
    exit 1
  fi

  if ! rg -q "sanitizeExternalUrl\\s*\\(" "$page_file"; then
    echo "[kw-guard][violation] sanitizeExternalUrl missing in $page_file"
    exit 1
  fi
done

echo "[kw-guard] all checks passed."
