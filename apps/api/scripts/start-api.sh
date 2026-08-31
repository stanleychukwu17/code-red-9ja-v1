#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod & go.sum lives
cd "$(dirname "$0")/.."

log_success() {
    echo -e "\e[32m$(date '+%Y/%m/%d %H:%M:%S'): $*\e[0m"
}

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

# swag: generate swagger documentation, during dev: you can comment the below out, to speed up starting of the server
# echo "Generating Swagger documentation..."
# if ! swag init \
#   -g main.go \
#   -d ./cmd/api,./internal/handler,./internal/router \
#   --parseInternal --parseDependency \
#   -o docs; then
#     echo "Swagger generation failed. Check log.txt"
#     exit 1
# fi
echo -e "\e[31m Swagger generation commented out \e[0m"

# sqlc: run sqlc concurrently in the background
echo "Generating SQL queries..."
(sqlc generate && log_success "SQL queries generated successfully") &
SQLC_PID=$!

# goose: runs the script that sets environment variables for goose
echo "Setting environment variables for goose..."
source ./scripts/set_goose_variables.sh
# you can do: . ./scripts/set_goose_variables.sh

# goose: run migrations
echo "Running goose database migrations..."
goose.exe -dir db/migrations/ up
log_success "Goose migrations ran successfully"

# wait for background sqlc generation to finish before starting air
wait $SQLC_PID

# air: start the server
echo "Starting Go server..."
air

