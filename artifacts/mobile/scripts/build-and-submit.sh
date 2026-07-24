#!/bin/bash
# build-and-submit.sh
# Builds the Android AAB via EAS and submits it to Google Play in one step.
# Requires two Replit Secrets:
#   EXPO_TOKEN              — EAS access token (expo.dev → Account → Access Tokens)
#   GOOGLE_SERVICE_ACCOUNT_KEY — full JSON content of the Google Play service account key
set -euo pipefail

# ── Preflight checks ──────────────────────────────────────────────────────────

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "ERROR: EXPO_TOKEN is not set."
  echo "Create a token at https://expo.dev/accounts/<username>/settings/access-tokens"
  echo "then add it as EXPO_TOKEN in Replit Secrets."
  exit 1
fi

if [ -z "${GOOGLE_SERVICE_ACCOUNT_KEY:-}" ]; then
  echo "ERROR: GOOGLE_SERVICE_ACCOUNT_KEY is not set."
  echo ""
  echo "Follow these steps to create and store the key:"
  echo "  1. Open https://console.cloud.google.com and select your project."
  echo "  2. Go to IAM & Admin → Service Accounts → Create service account."
  echo "  3. Name it (e.g. 'eas-submit'), grant no roles here."
  echo "  4. Create a JSON key: Actions → Manage keys → Add key → Create new key → JSON."
  echo "  5. In Google Play Console → Setup → API access, link the same GCP project."
  echo "  6. Grant the service account 'Release manager' permission on your app."
  echo "  7. Copy the downloaded JSON file content and add it as GOOGLE_SERVICE_ACCOUNT_KEY"
  echo "     in Replit Secrets (the full JSON, including curly braces)."
  exit 1
fi

# ── Write key to a temp file EAS can reference ────────────────────────────────

KEY_FILE="$(mktemp /tmp/gsa-XXXXXX.json)"
trap 'rm -f "$KEY_FILE"' EXIT

printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" > "$KEY_FILE"
export GOOGLE_SA_KEY_PATH="$KEY_FILE"

echo "Service account key written to temp file."
echo "Starting EAS build + auto-submit for Android (production profile)..."
echo ""

# ── Build and submit ───────────────────────────────────────────────────────────

EXPO_TOKEN="$EXPO_TOKEN" EAS_NO_VCS=1 pnpm exec eas build \
  --platform android \
  --profile production \
  --auto-submit \
  --non-interactive

echo ""
echo "Done. The AAB has been built and submitted to Google Play (internal track)."
echo "Check https://play.google.com/console for the release status."
