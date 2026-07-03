#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod & go.sum lives
cd "$(dirname "$0")/.."

# Check if ip-service is running
if [ -z "$NO_AUTOSTART_IP" ]; then
    if ! netstat -aon | grep -qE ":8081\s+.*LISTEN" ; then
        echo "IP Service is not running. Starting it in the background..."
        export NO_AUTOSTART_API=1
        (cd ../ip-service && bash scripts/start-ip-service.sh &)
    fi
fi

# docker: start postgres & redis databases
echo "Starting PostgreSQL and Redis instances.."
source ./scripts/docker-up-postgres-redis.sh

# swag: generate swagger documentation
echo "Generating Swagger documentation..."
if ! swag init \
  -g main.go \
  -d ./cmd/api,./internal/handler,./internal/router \
  --parseInternal --parseDependency \
  -o docs; then
    echo "Swagger generation failed. Check log.txt"
    exit 1
fi

# goose: runs the script that sets environment variables for goose
echo "Setting environment variables for goose..."
source ./scripts/set_goose_variables.sh
# you can do: . ./scripts/set_goose_variables.sh

# goose: run migrations
echo "Running goose database migrations..."
goose.exe -dir db/migrations/ up

# sqlc: run sqlc
echo "Generating SQL queries..."
sqlc generate

# air: start the server
echo "Starting Go server..."
air