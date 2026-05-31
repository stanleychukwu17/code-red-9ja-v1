#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod lives
cd "$(dirname "$0")/.."

# docker: start postgres & redis databases
echo "Starting PostgreSQL and Redis instances.."
source ./scripts/docker-up-postgres-redis.sh

# swag: generate swagger documentation
echo "Generating Swagger documentation..."
if ! swag init \
  -g main.go \
  -d ./cmd/api,./internal/handler,./internal/router \
  -o docs; then
    echo "Swagger generation failed. Check log.txt"
    exit 1
fi

echo "Swagger documentation generated successfully!"

# goose: runs the script that sets environment variables for goose
source ./scripts/set_goose_variables.sh
# you can do: . ./scripts/set_goose_variables.sh

# goose: run migrations
echo "Running database migrations..."
goose.exe -dir db/migrations/ up

# sqlc: run sqlc
echo "Generating SQL queries..."
sqlc generate

# air: start the server
echo "Starting Go server..."
air