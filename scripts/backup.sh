#!/usr/bin/env bash
set -euo pipefail

# Database backup script
# Usage: ./scripts/backup.sh [output-dir]
#
# Environment variables:
#   DATABASE_URL          — PostgreSQL connection string (required)
#   BACKUP_DIR            — Directory to store backups (default: ./backups)
#   BACKUP_RETENTION_DAYS — Number of days to keep backups (default: 7)
#   S3_BUCKET             — S3 bucket for off-site storage (optional)
#   S3_PREFIX             — S3 key prefix (default: db-backups)
#   AWS_PROFILE           — AWS CLI profile (optional)

OUTPUT_DIR="${1:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="linkify_${TIMESTAMP}.sql.gz"
FILEPATH="${OUTPUT_DIR}/${FILENAME}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Backing up database to $FILEPATH ..."
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$FILEPATH"

FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH" 2>/dev/null)
echo "Backup complete: $FILENAME ($(( FILESIZE / 1024 / 1024 )) MB)"

# Retention: remove backups older than RETENTION_DAYS
find "$OUTPUT_DIR" -name "linkify_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
echo "Cleaned up backups older than ${RETENTION_DAYS} days"

# Optional: sync to S3
if [ -n "${S3_BUCKET:-}" ]; then
  S3_PREFIX="${S3_PREFIX:-db-backups}"
  S3_PATH="s3://${S3_BUCKET}/${S3_PREFIX}/"
  echo "Uploading to ${S3_PATH} ..."

  if [ -n "${AWS_PROFILE:-}" ]; then
    aws s3 cp "$FILEPATH" "${S3_PATH}" --profile "$AWS_PROFILE"
  else
    aws s3 cp "$FILEPATH" "${S3_PATH}"
  fi

  echo "Upload complete"
fi
