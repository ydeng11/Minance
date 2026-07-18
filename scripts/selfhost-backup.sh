#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: scripts/selfhost-backup.sh [--stamp <UTC stamp>]

Environment overrides:
  MINANCE_BACKUP_ROOT      Default: ./backups
  MINANCE_RUNTIME_DATA_DIR Default: ./services/api/data
  MINANCE_SQLITE_FILE      Default: <MINANCE_RUNTIME_DATA_DIR>/production-minance.sqlite
  MINANCE_DATA_FILE        Default: <MINANCE_RUNTIME_DATA_DIR>/store.json (optional JSON fixture/input file)
  MINANCE_UPLOAD_DIR       Default: <MINANCE_RUNTIME_DATA_DIR>/uploads
USAGE
}

checksum_file() {
  local file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return
  fi
  echo "checksum_unavailable"
}

STAMP=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stamp)
      STAMP="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

BACKUP_ROOT="${MINANCE_BACKUP_ROOT:-./backups}"
RUNTIME_DATA_DIR="${MINANCE_RUNTIME_DATA_DIR:-./services/api/data}"
SQLITE_FILE="${MINANCE_SQLITE_FILE:-${RUNTIME_DATA_DIR}/production-minance.sqlite}"
JSON_FILE="${MINANCE_DATA_FILE:-${RUNTIME_DATA_DIR}/store.json}"
UPLOAD_DIR="${MINANCE_UPLOAD_DIR:-${RUNTIME_DATA_DIR}/uploads}"

if [[ -z "$STAMP" ]]; then
  STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
fi

DEST_DIR="${BACKUP_ROOT}/${STAMP}"
mkdir -p "$DEST_DIR"

if [[ -f "$SQLITE_FILE" ]]; then
  cp "$SQLITE_FILE" "$DEST_DIR/minance.sqlite"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DEST_DIR/minance.sqlite" "PRAGMA quick_check;" > "$DEST_DIR/sqlite-quick-check.txt" || true
  fi
fi

if [[ -f "$JSON_FILE" ]]; then
  cp "$JSON_FILE" "$DEST_DIR/store.json"
fi

if [[ -d "$UPLOAD_DIR" ]]; then
  tar -czf "$DEST_DIR/uploads.tar.gz" -C "$UPLOAD_DIR" .
fi

: > "$DEST_DIR/checksums.txt"
for artifact in minance.sqlite store.json uploads.tar.gz sqlite-quick-check.txt; do
  if [[ -f "$DEST_DIR/$artifact" ]]; then
    printf "%s  %s\n" "$(checksum_file "$DEST_DIR/$artifact")" "$artifact" >> "$DEST_DIR/checksums.txt"
  fi
done

cat > "$DEST_DIR/manifest.txt" <<MANIFEST
created_at_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
stamp=${STAMP}
runtime_data_dir=${RUNTIME_DATA_DIR}
sqlite_file=${SQLITE_FILE}
json_file=${JSON_FILE}
json_file_optional=true
upload_dir=${UPLOAD_DIR}
MANIFEST

echo "Backup created at ${DEST_DIR}"
