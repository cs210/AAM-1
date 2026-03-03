#!/usr/bin/env bash
set -euo pipefail

# This script is intended to run from the apps/web Vercel project.
# It deploys Convex with preview-aware environment variables to avoid auth origin issues.

normalize_url() {
  local value="${1:-}"
  value="$(echo "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  value="${value#https://}"
  value="${value#http://}"
  echo "https://${value}"
}

build_alias_urls() {
  printf '%s\n' "$@" \
    | tr ',' '\n' \
    | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' \
    | sed '/^$/d' \
    | sed 's#^https\?://##' \
    | sed 's#^#https://#' \
    | awk '!seen[$0]++' \
    | paste -sd, -
}

cd ../../packages/backend

if [[ "${VERCEL_TARGET_ENV:-}" == "preview" ]]; then
  if [[ -z "${VERCEL_GIT_COMMIT_REF:-}" || -z "${VERCEL_URL:-}" ]]; then
    echo "Missing VERCEL_GIT_COMMIT_REF or VERCEL_URL for preview deploy"
    exit 1
  fi

  PREVIEW_NAME="${VERCEL_GIT_COMMIT_REF}"
  PREVIEW_SITE_URL="$(normalize_url "${VERCEL_BRANCH_URL:-$VERCEL_URL}")"
  PREVIEW_ALIAS_URLS="$(build_alias_urls "${PREVIEW_SITE_URL}" "${VERCEL_BRANCH_URL:-}" "${VERCEL_URL:-}")"

  # Create/deploy preview scoped by branch/ref name.
  pnpm exec convex deploy --preview-create "${PREVIEW_NAME}" \
    --cmd "cd ../../apps/web && pnpm turbo run build --filter=web" \
    --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL

  # Scope env values to this preview deployment to avoid cross-preview origin conflicts.
  pnpm exec convex env set --preview-name "${PREVIEW_NAME}" SITE_URL "${PREVIEW_SITE_URL}"
  pnpm exec convex env set --preview-name "${PREVIEW_NAME}" ALIAS_URL "${PREVIEW_ALIAS_URLS}"
else
  # Production/other targets.
  PROD_SITE_URL="https://yami-stanford.vercel.app"
  PROD_ALIAS_URLS="$(build_alias_urls \
    "${PROD_SITE_URL}" \
    "https://aam-web-git-main-stanford-yami.vercel.app" \
    "${VERCEL_BRANCH_URL:-}" \
    "${VERCEL_URL:-}")"

  pnpm exec convex env set SITE_URL "${PROD_SITE_URL}"
  pnpm exec convex env set ALIAS_URL "${PROD_ALIAS_URLS}"

  pnpm exec convex deploy \
    --cmd "cd ../../apps/web && pnpm turbo run build --filter=web" \
    --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
fi
