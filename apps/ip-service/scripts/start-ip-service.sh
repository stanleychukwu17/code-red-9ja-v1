#!/bin/bash

# Navigate to the ip-service root directory
cd "$(dirname "$0")/.."

# Check if api is running
if [ -z "$NO_AUTOSTART_API" ]; then
    if ! netstat -aon | grep -qE ":4000\s+.*LISTEN" ; then
        echo "API is not running. Starting it in the background..."
        export NO_AUTOSTART_IP=1
        (cd ../api && bash scripts/start-api.sh &)
    fi
fi

# checks to see if there is a docker-compose file
is_file="../api/docker-compose.dev.yml"
if [ ! -f "$is_file" ]; then
    echo "API docker compose file not found at $is_file"
    exit 1
fi

# Check if redis is running
if [ "$(docker ps -q -f name=redis_free9ja)" = "" ]; then

  # check if there is already a redis container
  if [ ! "$(docker ps -aq -f name=redis_free9ja)" = "" ]; then
    docker compose -f $is_file start redis_free9ja
  else
    docker compose -f $is_file up -d redis_free9ja
  fi
fi

if [ "$(docker ps -q -f name=redis_free9ja)" != "" ]; then
    echo "Redis docker container (redis_free9ja) is running"
else
    echo "Redis container not running, please check to see if the docker engine is running"
    exit 1
fi

# Start the Go server
echo "Starting IP Service..."
go run main.go
