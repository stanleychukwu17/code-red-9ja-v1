#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod lives
cd "$(dirname "$0")/.."

echo "Generating Swagger documentation..."

if ! swag init \
  -g main.go \
  -d ./cmd/api,./internal/handler,./internal/router \
  -o docs; then
    echo "Swagger generation failed."
    exit 1
fi

echo "Swagger documentation generated successfully!"
