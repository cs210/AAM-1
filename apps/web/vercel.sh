#!/usr/bin/env bash
set -euo pipefail

# This script is intended to run from the apps/web Vercel project.
# It deploys Convex with preview-aware environment variables to avoid auth origin issues.

cd ../../packages/backend

if [[ "${VERCEL_TARGET_ENV:-}" == "preview" ]]; then
  if [[ -z "${VERCEL_GIT_COMMIT_REF:-}" || -z "${VERCEL_URL:-}" ]]; then
    echo "Missing VERCEL_GIT_COMMIT_REF or VERCEL_URL for preview deploy"
    exit 1
  fi

  PREVIEW_NAME="${VERCEL_GIT_COMMIT_REF}"
  PREVIEW_HOST="${VERCEL_URL#https://}"
  PREVIEW_URL="https://${PREVIEW_HOST}"

  # Create/deploy preview scoped by branch/ref name.
  pnpm exec convex deploy --preview-create "${PREVIEW_NAME}" \
    --cmd "cd ../../apps/web && pnpm turbo run build --filter=web" \
    --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL

  # Scope env values to this preview deployment to avoid cross-preview origin conflicts.
  pnpm exec convex env set --preview-name "${PREVIEW_NAME}" SITE_URL "${PREVIEW_URL}"
  pnpm exec convex env set --preview-name "${PREVIEW_NAME}" VERCEL_URL "${PREVIEW_HOST}"
else
  # Production/other targets.
  pnpm exec convex deploy \
    --cmd "cd ../../apps/web && pnpm turbo run build --filter=web" \
    --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
fi
