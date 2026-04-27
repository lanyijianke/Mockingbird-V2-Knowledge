#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASE_URL="${1:-http://localhost:5046}"

if ! command -v rg >/dev/null 2>&1; then
  echo "[seo-readiness] ripgrep (rg) is required but not installed."
  exit 1
fi

cd "$REPO_ROOT"

echo "[seo-readiness] 1/5 checking runtime robots output..."
curl -fsS "${BASE_URL}/robots.txt" | rg "Sitemap: ${BASE_URL}/sitemap.xml"

echo "[seo-readiness] 2/5 checking runtime sitemap output..."
curl -fsS "${BASE_URL}/sitemap.xml" | rg "<loc>${BASE_URL}/sitemaps/"

echo "[seo-readiness] 3/5 checking growth pages respond at runtime..."
curl -fsS "${BASE_URL}/prompts/scenarios" | rg "<link rel=\"canonical\" href=\"${BASE_URL}/prompts/scenarios\"|提示词场景页"
curl -fsS "${BASE_URL}/prompts/scenarios/video-generation" | rg "<link rel=\"canonical\" href=\"${BASE_URL}/prompts/scenarios/video-generation\"|视频生成提示词"
curl -fsS "${BASE_URL}/rankings/topics" | rg "<link rel=\"canonical\" href=\"${BASE_URL}/rankings/topics\"|热榜专题"
curl -fsS "${BASE_URL}/rankings/topics/ai-launches-producthunt" | rg "<link rel=\"canonical\" href=\"${BASE_URL}/rankings/topics/ai-launches-producthunt\"|AI 新品发布"

echo "[seo-readiness] 4/5 checking search platform runbook/manual notes..."
if ! rg -F -q "只能在真实域名上线后手动完成" "docs/search-platform-operations.md" "README.md"; then
  echo "[seo-readiness][violation] missing manual post-launch note for Search Console/Bing verification/submission"
  exit 1
fi

echo "[seo-readiness] 5/5 checking weekly observation log linkage..."
if ! rg -F -q "search-platform-observation-log.md" "docs/search-platform-operations.md" "README.md"; then
  echo "[seo-readiness][violation] missing observation log reference"
  exit 1
fi

echo "[seo-readiness] all repo-controlled checks passed."
