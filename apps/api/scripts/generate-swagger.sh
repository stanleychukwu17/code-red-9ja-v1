#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod lives
cd "$(dirname "$0")/.."

echo "Generating Swagger documentation..."

if ! swag init \
  -g main.go \
  -d ./cmd/api,./internal/handler,./internal/router,./internal/service/auth,./internal/handler/auth,./internal/handler/parties,./internal/handler/files,./internal/handler/election_results \
  -o docs; then
    echo "Swagger generation failed."
    exit 1
fi

echo "Swagger documentation generated successfully!"
