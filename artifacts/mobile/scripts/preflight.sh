#!/bin/bash
# preflight.sh
# Fast sanity check before spending ~20 minutes on an EAS build.
# Validates:
#   1. EXPO_TOKEN presence
#   2. EAS token validity (eas whoami)
#   3. eas.json production build + submit config sanity
#   4. Google Play service account (Play Developer API probe)
#
# All checks run to completion even when earlier ones fail, so you get a full
# picture of what needs fixing in a single pass.
#
# Usage:
#   pnpm run preflight                             (from artifacts/mobile)
#   pnpm --filter @workspace/mobile run preflight  (from workspace root)
#
# Exits 0 with a summary if every check passes.
# Exits 1 with a clear error message for each failure.

# Avoid set -e here: we want every check to run even when earlier ones fail.
# Individual failures are captured via exit-code inspection instead.
set -uo pipefail

ANDROID_PACKAGE="com.macrocarry.app"
PLAY_API_BASE="https://androidpublisher.googleapis.com/androidpublisher/v3/applications"

PASS=0
FAIL=0

_ok()   { echo "  ✓ $*"; PASS=$((PASS + 1)); }
_fail() { echo "  ✗ $*"; FAIL=$((FAIL + 1)); }

echo ""
echo "MacroCarry EAS preflight check"
echo "================================"
echo ""

# ── 1. EXPO_TOKEN presence ─────────────────────────────────────────────────────

echo "[ 1/4 ] EXPO_TOKEN"
if [ -z "${EXPO_TOKEN:-}" ]; then
  _fail "EXPO_TOKEN is not set."
  echo "        Create a token at https://expo.dev/settings/access-tokens"
  echo "        then add it as EXPO_TOKEN in Replit Secrets."
else
  _ok "EXPO_TOKEN is set."
fi

# ── 2. EAS whoami (token validity) ────────────────────────────────────────────

echo ""
echo "[ 2/4 ] EAS token validity (eas whoami)"
if [ -z "${EXPO_TOKEN:-}" ]; then
  _fail "Skipped — EXPO_TOKEN is not set (see check 1)."
else
  WHOAMI_OUTPUT=$(EXPO_TOKEN="$EXPO_TOKEN" EAS_NO_VCS=1 pnpm exec eas whoami 2>&1) && WHOAMI_EXIT=0 || WHOAMI_EXIT=$?
  if [ "$WHOAMI_EXIT" -eq 0 ]; then
    EAS_USER=$(echo "$WHOAMI_OUTPUT" | tr -d '[:space:]')
    _ok "Token is valid — logged in as: ${EAS_USER:-<unknown>}"
  else
    _fail "EXPO_TOKEN is invalid or expired (eas whoami exited with ${WHOAMI_EXIT})."
    echo "        Output: ${WHOAMI_OUTPUT}"
    echo "        Rotate the token at https://expo.dev/settings/access-tokens"
    echo "        and update EXPO_TOKEN in Replit Secrets."
  fi
fi

# ── 3. eas.json sanity ────────────────────────────────────────────────────────

echo ""
echo "[ 3/4 ] eas.json production config"

EAS_JSON_RESOLVED="$(cd "$(dirname "$0")/.." && pwd)/eas.json"
if [ ! -f "$EAS_JSON_RESOLVED" ]; then
  _fail "eas.json not found at expected path: ${EAS_JSON_RESOLVED}"
else
  # Check build.production.android.buildType == "app-bundle"
  BUILD_TYPE=$(python3 - "$EAS_JSON_RESOLVED" <<'PYEOF' 2>/dev/null
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("build", {}).get("production", {}).get("android", {}).get("buildType", ""))
except Exception:
    pass
PYEOF
) && : || BUILD_TYPE=""

  if [ "$BUILD_TYPE" = "app-bundle" ]; then
    _ok "build.production.android.buildType is \"app-bundle\" (correct for Play Store)."
  else
    _fail "build.production.android.buildType is \"${BUILD_TYPE:-missing}\" — expected \"app-bundle\" for Play Store submission."
    echo "        Update eas.json: build → production → android → buildType: \"app-bundle\""
  fi

  # Check build.production.distribution == "store"
  DISTRIBUTION=$(python3 - "$EAS_JSON_RESOLVED" <<'PYEOF' 2>/dev/null
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("build", {}).get("production", {}).get("distribution", ""))
except Exception:
    pass
PYEOF
) && : || DISTRIBUTION=""

  if [ "$DISTRIBUTION" = "store" ]; then
    _ok "build.production.distribution is \"store\" (correct for Play Store)."
  else
    _fail "build.production.distribution is \"${DISTRIBUTION:-missing}\" — expected \"store\"."
    echo "        Update eas.json: build → production → distribution: \"store\""
  fi

  # Check submit.production.android.serviceAccountKeyPath is set and non-empty
  SA_KEY_PATH=$(python3 - "$EAS_JSON_RESOLVED" <<'PYEOF' 2>/dev/null
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("submit", {}).get("production", {}).get("android", {}).get("serviceAccountKeyPath", ""))
except Exception:
    pass
PYEOF
) && : || SA_KEY_PATH=""

  if [ -n "$SA_KEY_PATH" ]; then
    _ok "submit.production.android.serviceAccountKeyPath is set: \"${SA_KEY_PATH}\""
  else
    _fail "submit.production.android.serviceAccountKeyPath is missing or empty."
    echo "        Expected: \"\$GOOGLE_SA_KEY_PATH\" (set at runtime by build-and-submit.sh)"
    echo "        Update eas.json: submit → production → android → serviceAccountKeyPath"
  fi

  # Check submit.production.android.track is set and non-empty
  TRACK=$(python3 - "$EAS_JSON_RESOLVED" <<'PYEOF' 2>/dev/null
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("submit", {}).get("production", {}).get("android", {}).get("track", ""))
except Exception:
    pass
PYEOF
) && : || TRACK=""

  VALID_TRACKS="internal alpha beta production"
  if echo "$VALID_TRACKS" | grep -qw "${TRACK:-}"; then
    _ok "submit.production.android.track is \"${TRACK}\" (valid Play Console track)."
  elif [ -z "$TRACK" ]; then
    _fail "submit.production.android.track is missing."
    echo "        Set it to one of: internal, alpha, beta, production."
    echo "        Update eas.json: submit → production → android → track"
  else
    _fail "submit.production.android.track is \"${TRACK}\" — not a recognised Play Console track."
    echo "        Valid values: internal, alpha, beta, production."
  fi
fi

# ── 4. Play Console service account ───────────────────────────────────────────

echo ""
echo "[ 4/4 ] Google Play service account (GOOGLE_SERVICE_ACCOUNT_KEY)"

if [ -z "${GOOGLE_SERVICE_ACCOUNT_KEY:-}" ]; then
  _fail "GOOGLE_SERVICE_ACCOUNT_KEY is not set."
  echo "        See the 'Automated Build + Submit → Prerequisites' section in"
  echo "        artifacts/mobile/store-assets/STORE_LISTING.md for setup steps."
else
  _b64url() {
    python3 -c "import sys,base64; print(base64.urlsafe_b64encode(sys.stdin.buffer.read()).rstrip(b'=').decode())"
  }

  # Parse the service account JSON — capture failure without aborting
  SA_EMAIL=$(printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d['client_email'])" 2>/dev/null) && SA_EMAIL_OK=0 || SA_EMAIL_OK=$?
  SA_PRIVATE_KEY=$(printf '%s' "$GOOGLE_SERVICE_ACCOUNT_KEY" | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d['private_key'])" 2>/dev/null) && SA_KEY_OK=0 || SA_KEY_OK=$?

  if [ "${SA_EMAIL_OK:-1}" -ne 0 ] || [ -z "${SA_EMAIL:-}" ]; then
    _fail "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON or is missing 'client_email'."
  elif [ "${SA_KEY_OK:-1}" -ne 0 ] || [ -z "${SA_PRIVATE_KEY:-}" ]; then
    _fail "GOOGLE_SERVICE_ACCOUNT_KEY is missing 'private_key'."
  else
    # Write private key to a temp file for openssl signing
    KEY_PEM=$(mktemp /tmp/sa-pem-XXXXXX.pem)
    TOKEN_FILE=$(mktemp /tmp/sa-token-XXXXXX.json)
    EDIT_FILE=$(mktemp /tmp/sa-edit-XXXXXX.json)
    trap 'rm -f "${KEY_PEM:-}" "${TOKEN_FILE:-}" "${EDIT_FILE:-}"' EXIT
    printf '%s\n' "$SA_PRIVATE_KEY" > "$KEY_PEM"

    # Build a short-lived JWT (RS256, 5-minute expiry)
    NOW=$(date +%s)
    EXP=$((NOW + 300))
    JWT_HEADER=$(printf '{"alg":"RS256","typ":"JWT"}' | _b64url)
    JWT_PAYLOAD=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/androidpublisher","aud":"https://oauth2.googleapis.com/token","iat":%d,"exp":%d}' \
      "$SA_EMAIL" "$NOW" "$EXP" | _b64url)
    SIGNING_INPUT="$JWT_HEADER.$JWT_PAYLOAD"
    JWT_SIG=$(printf '%s' "$SIGNING_INPUT" | openssl dgst -sha256 -sign "$KEY_PEM" 2>/dev/null | _b64url) && OPENSSL_OK=0 || OPENSSL_OK=$?

    if [ "$OPENSSL_OK" -ne 0 ] || [ -z "${JWT_SIG:-}" ]; then
      _fail "Failed to sign the service account JWT (openssl error)."
      echo "        The 'private_key' in GOOGLE_SERVICE_ACCOUNT_KEY may be malformed."
    else
      JWT="$SIGNING_INPUT.$JWT_SIG"

      # Exchange JWT for an access token
      TOKEN_HTTP=$(curl -s -o "$TOKEN_FILE" -w "%{http_code}" --max-time 10 \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
        --data-urlencode "assertion=$JWT" \
        "https://oauth2.googleapis.com/token") && CURL_OK=0 || CURL_OK=$?

      if [ "$CURL_OK" -ne 0 ]; then
        _fail "Could not contact Google's auth server. Check your internet connection."
      elif [ "$TOKEN_HTTP" != "200" ]; then
        AUTH_ERR=$(python3 -c "import json; d=json.load(open('$TOKEN_FILE')); print(d.get('error_description', d.get('error','unknown error')))" 2>/dev/null || echo "unknown error")
        _fail "Service account authentication failed (HTTP ${TOKEN_HTTP}) — ${AUTH_ERR}"
        echo "        The key may be expired, revoked, or the service account deleted."
        echo "        Verify at: https://console.cloud.google.com/iam-admin/serviceaccounts"
      else
        ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$TOKEN_FILE'))['access_token'])" 2>/dev/null) && AT_OK=0 || AT_OK=$?
        if [ "$AT_OK" -ne 0 ] || [ -z "${ACCESS_TOKEN:-}" ]; then
          _fail "Could not extract access_token from Google OAuth response."
        else
          # Probe the Play Developer API: POST /edits
          EDIT_HTTP=$(curl -s -o "$EDIT_FILE" -w "%{http_code}" --max-time 10 \
            -X POST \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{}' \
            "${PLAY_API_BASE}/${ANDROID_PACKAGE}/edits") && EDIT_CURL_OK=0 || EDIT_CURL_OK=$?

          if [ "$EDIT_CURL_OK" -ne 0 ]; then
            _fail "Could not contact Play Developer API. Check your internet connection."
          else
            case "$EDIT_HTTP" in
              200|201)
                _ok "Service account authenticated — has Release Manager access to Play Console."
                EDIT_ID=$(python3 -c "import json; print(json.load(open('$EDIT_FILE')).get('id',''))" 2>/dev/null || true)
                if [ -n "${EDIT_ID:-}" ]; then
                  curl -s --max-time 10 -X DELETE \
                    -H "Authorization: Bearer $ACCESS_TOKEN" \
                    "${PLAY_API_BASE}/${ANDROID_PACKAGE}/edits/${EDIT_ID}" > /dev/null 2>&1 || true
                fi
                ;;
              409)
                _ok "Service account authenticated — has Release Manager access to Play Console."
                echo "        (Note: a pending edit already exists in Play Console; EAS will handle it.)"
                ;;
              401)
                _fail "Play Developer API rejected the service account token (HTTP 401)."
                echo "        The service account may have been removed or the API is not enabled."
                echo "        Fix at: https://play.google.com/console/developers/api-access"
                ;;
              403)
                _fail "Service account lacks 'Release manager' permission in Play Console (HTTP 403)."
                echo "        Grant access at: https://play.google.com/console/developers/api-access"
                ;;
              404)
                _fail "App '${ANDROID_PACKAGE}' not found in Play Console (HTTP 404)."
                echo "        The service account may not have app-level access."
                echo "        Fix at: https://play.google.com/console/developers/api-access"
                ;;
              *)
                EDIT_ERR=$(python3 -c "import json; d=json.load(open('$EDIT_FILE')); print(d.get('error',{}).get('message','unknown error'))" 2>/dev/null || echo "unknown error")
                _fail "Unexpected response from Play Developer API (HTTP ${EDIT_HTTP}) — ${EDIT_ERR}"
                echo "        Check: https://play.google.com/console/developers/api-access"
                ;;
            esac
          fi
        fi
      fi
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "================================"
TOTAL=$((PASS + FAIL))
echo "Results: ${PASS}/${TOTAL} checks passed"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Fix the ${FAIL} issue(s) above before running 'pnpm run build:submit'."
  exit 1
else
  echo ""
  echo "All checks passed. You are ready to run 'pnpm run build:submit'."
  exit 0
fi
