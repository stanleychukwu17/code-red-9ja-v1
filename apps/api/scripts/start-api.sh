#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod lives
cd "$(dirname "$0")/.."

echo "Generating Swagger documentation..."

if ! swag init \
  -g main.go \
  -d ./cmd/api,./internal/handler,./internal/router \
  -o docs; then
    echo "Swagger generation failed. Check log.txt"
    exit 1
fi

echo "Swagger documentation generated successfully!"

# set environment variables
source ./scripts/set_goose_variables.sh
# you can do: . ./scripts/set_goose_variables.sh

# run migrations
echo "Running database migrations..."
goose.exe -dir db/migrations/ up

# run sqlc
echo "Generating SQL queries..."
sqlc generate

echo "Starting Go server..."
air