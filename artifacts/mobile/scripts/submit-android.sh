#!/bin/bash
set -e

if [ -z "$GOOGLE_SERVICE_ACCOUNT_KEY" ]; then
  echo "Error: GOOGLE_SERVICE_ACCOUNT_KEY secret is not set."
  echo "Add it in Replit Secrets with the full JSON content of your Google service account key file."
  exit 1
fi

KEY_FILE="$(mktemp /tmp/gsa-XXXXXX.json)"
trap 'rm -f "$KEY_FILE"' EXIT

printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" > "$KEY_FILE"

export GOOGLE_SA_KEY_PATH="$KEY_FILE"

EXPO_TOKEN="$EXPO_TOKEN" EAS_NO_VCS=1 pnpm exec eas submit \
  --platform android \
  --profile production \
  --latest \
  --non-interactive
