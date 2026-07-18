#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: scripts/selfhost-restore.sh --backup <backup_dir> [--apply]

Defaults to non-destructive staging mode unless --apply is set.

Environment overrides:
  MINANCE_RUNTIME_DATA_DIR Default: ./services/api/data
  MINANCE_SQLITE_FILE      Default: <MINANCE_RUNTIME_DATA_DIR>/production-minance.sqlite
  MINANCE_DATA_FILE        Default: <MINANCE_RUNTIME_DATA_DIR>/store.json (optional JSON fixture/input file)
  MINANCE_UPLOAD_DIR       Default: <MINANCE_RUNTIME_DATA_DIR>/uploads
  MINANCE_RESTORE_STAGING  Default: ./services/api/tmp/restore-staging
USAGE
}

BACKUP_DIR=""
APPLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --apply)
      APPLY=true
      shift
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

if [[ -z "$BACKUP_DIR" ]]; then
  echo "--backup is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "Backup directory does not exist: $BACKUP_DIR" >&2
  exit 1
fi

RUNTIME_DATA_DIR="${MINANCE_RUNTIME_DATA_DIR:-./services/api/data}"
SQLITE_FILE="${MINANCE_SQLITE_FILE:-${RUNTIME_DATA_DIR}/production-minance.sqlite}"
JSON_FILE="${MINANCE_DATA_FILE:-${RUNTIME_DATA_DIR}/store.json}"
UPLOAD_DIR="${MINANCE_UPLOAD_DIR:-${RUNTIME_DATA_DIR}/uploads}"
STAGING_DIR="${MINANCE_RESTORE_STAGING:-./services/api/tmp/restore-staging}"

TARGET_ROOT="$STAGING_DIR"
if [[ "$APPLY" == "true" ]]; then
  TARGET_ROOT="$RUNTIME_DATA_DIR"
fi

mkdir -p "$TARGET_ROOT"
mkdir -p "$(dirname "$SQLITE_FILE")"
mkdir -p "$(dirname "$JSON_FILE")"
mkdir -p "$UPLOAD_DIR"

TARGET_SQLITE="${TARGET_ROOT}/$(basename "$SQLITE_FILE")"
TARGET_JSON="${TARGET_ROOT}/$(basename "$JSON_FILE")"
TARGET_UPLOADS="${TARGET_ROOT}/uploads"

if [[ -f "$BACKUP_DIR/minance.sqlite" ]]; then
  cp "$BACKUP_DIR/minance.sqlite" "$TARGET_SQLITE"
fi

if [[ -f "$BACKUP_DIR/store.json" ]]; then
  cp "$BACKUP_DIR/store.json" "$TARGET_JSON"
fi

if [[ -f "$BACKUP_DIR/uploads.tar.gz" ]]; then
  rm -rf "$TARGET_UPLOADS"
  mkdir -p "$TARGET_UPLOADS"
  tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$TARGET_UPLOADS"
fi

if [[ "$APPLY" == "true" ]]; then
  if [[ -f "$TARGET_SQLITE" ]]; then
    cp "$TARGET_SQLITE" "$SQLITE_FILE"
  fi
  if [[ -f "$TARGET_JSON" ]]; then
    cp "$TARGET_JSON" "$JSON_FILE"
  fi
  if [[ -d "$TARGET_UPLOADS" ]]; then
    rm -rf "$UPLOAD_DIR"
    mkdir -p "$UPLOAD_DIR"
    cp -R "$TARGET_UPLOADS/." "$UPLOAD_DIR/"
  fi

  echo "Restore applied from $BACKUP_DIR"
  echo "Targets:"
  echo "  SQLITE: $SQLITE_FILE"
  echo "  JSON:   $JSON_FILE (optional)"
  echo "  Upload: $UPLOAD_DIR"
else
  echo "Restore staged at $TARGET_ROOT"
  echo "Run again with --apply to overwrite runtime files."
fi
