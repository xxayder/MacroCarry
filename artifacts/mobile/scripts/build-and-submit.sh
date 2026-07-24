#!/bin/bash
# build-and-submit.sh
# Builds the Android AAB via EAS and submits it to Google Play in one step.
# Requires two Replit Secrets:
#   EXPO_TOKEN              — EAS access token (expo.dev → Account → Access Tokens)
#   GOOGLE_SERVICE_ACCOUNT_KEY — full JSON content of the Google Play service account key
set -euo pipefail

ANDROID_PACKAGE="com.macrocarry.app"
PLAY_API_BASE="https://androidpublisher.googleapis.com/androidpublisher/v3/applications"

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

# ── Play Console permission pre-check ─────────────────────────────────────────
# Validates the service account can reach the Play Developer API before
# spending ~20 minutes on a build that would fail at submit time.
# Adds < 5 seconds (two curl calls, each with a 10-second timeout).

echo "Checking Play Console service account permissions..."

_b64url() {
  python3 -c "import sys,base64; print(base64.urlsafe_b64encode(sys.stdin.buffer.read()).rstrip(b'=').decode())"
}

# 1. Parse the service account JSON
SA_EMAIL=$(printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['client_email'])" 2>/dev/null) || {
  echo "ERROR: GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON or is missing 'client_email'."
  exit 1
}
SA_PRIVATE_KEY=$(printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['private_key'])" 2>/dev/null) || {
  echo "ERROR: GOOGLE_SERVICE_ACCOUNT_KEY is missing 'private_key'."
  exit 1
}

# 2. Write private key to a temp file for openssl signing
KEY_PEM=$(mktemp /tmp/sa-pem-XXXXXX.pem)

# DANGLING_EDIT_ID holds the Play Console draft edit ID while it is open.
# The _cleanup trap deletes it on any exit (success, SIGINT, EAS error, etc.)
# so a failed run never leaves a 409-blocking edit behind.
# It is cleared to "" immediately after the inline DELETE succeeds.
DANGLING_EDIT_ID=""

_cleanup() {
  rm -f "${KEY_PEM:-}" "${TOKEN_FILE:-}" "${EDIT_FILE:-}" "${KEY_FILE:-}"
  if [ -n "${DANGLING_EDIT_ID:-}" ] && [ -n "${ACCESS_TOKEN:-}" ]; then
    curl -s --max-time 10 -X DELETE \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "${PLAY_API_BASE}/${ANDROID_PACKAGE}/edits/${DANGLING_EDIT_ID}" \
      > /dev/null 2>&1 || true
  fi
}
trap '_cleanup' EXIT

printf '%s\n' "$SA_PRIVATE_KEY" > "$KEY_PEM"

# 3. Build a short-lived JWT (RS256, 5-minute expiry)
NOW=$(date +%s)
EXP=$((NOW + 300))

JWT_HEADER=$(printf '{"alg":"RS256","typ":"JWT"}' | _b64url)
JWT_PAYLOAD=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/androidpublisher","aud":"https://oauth2.googleapis.com/token","iat":%d,"exp":%d}' \
  "$SA_EMAIL" "$NOW" "$EXP" | _b64url)
SIGNING_INPUT="$JWT_HEADER.$JWT_PAYLOAD"
JWT_SIG=$(printf '%s' "$SIGNING_INPUT" | openssl dgst -sha256 -sign "$KEY_PEM" 2>/dev/null | _b64url)
JWT="$SIGNING_INPUT.$JWT_SIG"

# 4. Exchange JWT for an access token.
#    Do NOT use -f so that OAuth error JSON is captured (not silently dropped).
TOKEN_FILE=$(mktemp /tmp/sa-token-XXXXXX.json)

TOKEN_HTTP=$(curl -s -o "$TOKEN_FILE" -w "%{http_code}" --max-time 10 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  --data-urlencode "assertion=$JWT" \
  "https://oauth2.googleapis.com/token") || {
  echo "ERROR: Could not contact Google's auth server. Check your internet connection."
  exit 1
}

if [ "$TOKEN_HTTP" != "200" ]; then
  AUTH_ERR=$(python3 -c "import json,sys; d=json.load(open('$TOKEN_FILE')); print(d.get('error_description', d.get('error','unknown error')))" 2>/dev/null || echo "unknown error")
  echo "ERROR: Service account authentication failed (HTTP ${TOKEN_HTTP}) — ${AUTH_ERR}"
  echo ""
  echo "The key may be expired, revoked, or the service account may have been deleted."
  echo "Verify the service account at:"
  echo "  https://console.cloud.google.com/iam-admin/serviceaccounts"
  exit 1
fi

ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$TOKEN_FILE'))['access_token'])")

# 5. Probe the Play Developer API using POST /edits.
#    Creating a draft edit is the canonical way to confirm Release Manager access.
#    We immediately delete the edit if creation succeeds to leave no side effects.
#    A 409 (edit already in progress) also confirms we have permission.
EDIT_FILE=$(mktemp /tmp/sa-edit-XXXXXX.json)

EDIT_HTTP=$(curl -s -o "$EDIT_FILE" -w "%{http_code}" --max-time 10 \
  -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${PLAY_API_BASE}/${ANDROID_PACKAGE}/edits")

case "$EDIT_HTTP" in
  200|201)
    echo "  Service account OK — authenticated and has Release Manager access."
    # Register the edit ID so the EXIT trap can delete it even if we are interrupted
    DANGLING_EDIT_ID=$(python3 -c "import json; print(json.load(open('$EDIT_FILE')).get('id',''))" 2>/dev/null || true)
    # Also delete inline now so EAS doesn't see an open edit during the build
    if [ -n "$DANGLING_EDIT_ID" ]; then
      curl -s --max-time 10 -X DELETE \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "${PLAY_API_BASE}/${ANDROID_PACKAGE}/edits/${DANGLING_EDIT_ID}" > /dev/null 2>&1 || true
      DANGLING_EDIT_ID=""  # cleared — trap is now a no-op for this edit
    fi
    ;;
  409)
    # An active edit already exists — we have permission, nothing to clean up here
    echo "  Service account OK — authenticated and has Release Manager access."
    echo "  (Note: a pending edit already exists in Play Console; EAS will handle it.)"
    ;;
  401)
    echo "ERROR: Play Developer API rejected the service account token (HTTP 401)."
    echo ""
    echo "The service account may have been removed, or the Google Play Android Developer"
    echo "API may not be enabled for the linked GCP project. Fix it here:"
    echo "  https://play.google.com/console/developers/api-access"
    exit 1
    ;;
  403)
    echo "ERROR: Service account lacks 'Release manager' permission in Play Console (HTTP 403)."
    echo ""
    echo "Go to Play Console → Setup → API access and grant the service account"
    echo "'Release manager' (or 'Release' + 'View app information') permission for this app:"
    echo "  https://play.google.com/console/developers/api-access"
    exit 1
    ;;
  404)
    echo "ERROR: App '${ANDROID_PACKAGE}' was not found in Play Console (HTTP 404)."
    echo ""
    echo "The service account may not have been granted access to this app,"
    echo "or the app has not yet been created in Play Console. Fix it here:"
    echo "  https://play.google.com/console/developers/api-access"
    exit 1
    ;;
  *)
    EDIT_ERR=$(python3 -c "import json; d=json.load(open('$EDIT_FILE')); print(d.get('error',{}).get('message','unknown error'))" 2>/dev/null || echo "unknown error")
    echo "ERROR: Unexpected response from Play Developer API (HTTP ${EDIT_HTTP}) — ${EDIT_ERR}"
    echo ""
    echo "Check the API access configuration in Play Console:"
    echo "  https://play.google.com/console/developers/api-access"
    exit 1
    ;;
esac

echo ""

# ── Write key to a temp file EAS can reference ────────────────────────────────

KEY_FILE="$(mktemp /tmp/gsa-XXXXXX.json)"

printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" > "$KEY_FILE"
export GOOGLE_SA_KEY_PATH="$KEY_FILE"

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
