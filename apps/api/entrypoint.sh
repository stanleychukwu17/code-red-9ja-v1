#!/bin/sh
set -e

# Run database migrations if requested
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  
  # Default SSL mode to disable if not specified
  DB_SSLMODE=${DB_SSLMODE:-disable}
  
  # Format DSN for goose
  DB_DSN="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
  
  # Run goose migrations
  goose -dir /app/db/migrations postgres "$DB_DSN" up
fi

echo "Starting application..."
# Start the Go server
exec /app/api
