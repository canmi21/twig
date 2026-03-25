#!/usr/bin/env bash
# Deploy taki to Cloudflare Workers.
#
# Usage:
#   ./scripts/deploy.sh          # build + deploy worker + apply D1 migrations
#   ./scripts/deploy.sh --sync   # also sync local D1 data, R2 objects, and KV to remote
#
# Requires: wrangler logged in (`bunx wrangler login`)

set -euo pipefail

SYNC=false
if [[ "${1:-}" == "--sync" ]]; then
  SYNC=true
fi

DB_NAME="taki-sql"
BUCKET_NAME="taki-bucket"
KV_NAMESPACE_ID="e823da6d6efe4ebfa7a33945530c2602"

# Extract JSON array from wrangler output (strips proxy/banner lines)
extract_json() {
  python3 -c "
import sys
raw = sys.stdin.read()
start = raw.find('[')
end = raw.rfind(']')
if start >= 0 and end > start:
    print(raw[start:end+1])
else:
    print('[]')
"
}

echo "==> Building..."
bun run build

echo "==> Deploying worker..."
bunx wrangler deploy

echo "==> Applying D1 migrations..."
bunx wrangler d1 migrations apply "$DB_NAME" --remote

if [[ "$SYNC" != "true" ]]; then
  echo "Deploy complete."
  exit 0
fi

echo "==> Syncing local data to remote..."

# --- D1: export local, clear remote tables, import ---
DUMP_FILE=$(mktemp /tmp/taki-d1-dump.XXXXXX.sql)
trap 'rm -f "$DUMP_FILE"' EXIT

echo "  D1: exporting local database..."
bunx wrangler d1 export "$DB_NAME" --local --no-schema --output="$DUMP_FILE"

if [[ -s "$DUMP_FILE" ]]; then
  echo "  D1: clearing remote tables..."
  bunx wrangler d1 execute "$DB_NAME" --remote --yes \
    --command "DELETE FROM media_refs; DELETE FROM posts; DELETE FROM media; DELETE FROM contents;"

  echo "  D1: importing to remote..."
  bunx wrangler d1 execute "$DB_NAME" --remote --file="$DUMP_FILE" --yes
  echo "  D1: done"
else
  echo "  D1: no data to sync"
fi

# --- R2: push media files referenced in D1 media table ---
echo "  R2: reading media records from local D1..."

MEDIA_JSON=$(bunx wrangler d1 execute "$DB_NAME" --local \
  --command "SELECT hash, ext, mime FROM media" --json 2>&1 | extract_json)

R2_KEYS=$(echo "$MEDIA_JSON" | python3 -c "
import sys, json
data = json.loads(sys.stdin.read())
rows = data[0].get('results', []) if len(data) > 0 else []
cats = dict(webp='image',png='image',jpg='image',jpeg='image',gif='image',svg='image',avif='image',
            mp4='video',webm='video',mov='video',mp3='audio',wav='audio',ogg='audio',flac='audio')
for r in rows:
    t = cats.get(r['ext'], 'media')
    print(f\"{t}/{r['hash']}.{r['ext']}\t{r['mime']}\")
" 2>/dev/null || true)

if [[ -n "$R2_KEYS" ]]; then
  R2_COUNT=0
  while IFS=$'\t' read -r key mime; do
    LOCAL_FILE=$(mktemp /tmp/taki-r2-obj.XXXXXX)
    bunx wrangler r2 object get "$BUCKET_NAME/$key" --local --file="$LOCAL_FILE" 2>/dev/null || true
    if [[ -s "$LOCAL_FILE" ]]; then
      bunx wrangler r2 object put "$BUCKET_NAME/$key" --file="$LOCAL_FILE" --content-type="$mime" --remote 2>/dev/null
      echo "    $key"
      R2_COUNT=$((R2_COUNT + 1))
    fi
    rm -f "$LOCAL_FILE"
  done <<< "$R2_KEYS"
  echo "  R2: uploaded $R2_COUNT objects"
else
  echo "  R2: no media to sync"
fi

# --- KV: export each local key to a temp file, put to remote one by one ---
echo "  KV: reading local keys..."

KV_KEYS=$(bunx wrangler kv key list --namespace-id="$KV_NAMESPACE_ID" --local 2>&1 \
  | extract_json \
  | python3 -c "import sys,json; [print(k['name']) for k in json.loads(sys.stdin.read())]" 2>/dev/null || true)

KV_COUNT=0
if [[ -n "$KV_KEYS" ]]; then
  while IFS= read -r key; do
    KV_TMP=$(mktemp /tmp/taki-kv-val.XXXXXX)
    # Get value, strip wrangler banner (keep only content after last blank line)
    bunx wrangler kv key get "$key" --namespace-id="$KV_NAMESPACE_ID" --local --text 2>/dev/null \
      | python3 -c "
import sys
lines = sys.stdin.read().rstrip('\n').split('\n')
# Find last non-JSON preamble line
for i in range(len(lines)-1, -1, -1):
    if lines[i].startswith('[') or lines[i].startswith('{') or lines[i].startswith('\"'):
        # Likely start of JSON value — take from here
        break
# For KV values, take everything from first JSON-like line
start = 0
for j, line in enumerate(lines):
    if line.startswith('[') or line.startswith('{') or line.startswith('\"'):
        start = j
        break
print('\n'.join(lines[start:]))
" > "$KV_TMP"
    if [[ -s "$KV_TMP" ]]; then
      bunx wrangler kv key put "$key" --namespace-id="$KV_NAMESPACE_ID" --remote --path="$KV_TMP" 2>/dev/null
      echo "    $key"
      KV_COUNT=$((KV_COUNT + 1))
    fi
    rm -f "$KV_TMP"
  done <<< "$KV_KEYS"
  echo "  KV: uploaded $KV_COUNT keys"
else
  echo "  KV: no data to sync"
fi

echo "Deploy + sync complete."
