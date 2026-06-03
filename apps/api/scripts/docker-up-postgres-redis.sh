#!/bin/bash

# looks for the start-api.sh script in the current directory
# needs to be sure we're in the right directory
is_start_script=$(ls | grep -i -o "start-api.sh")

# if script folder, we want to cd back to the api root, where the docker-compose file is located
if [ ! -z "$is_start_script" ]; then
  cd "$(dirname "$0")/.."
fi

# checks to see if there is a docker-compose file
is_file=$( ls | grep -i -o "docker-compose.dev.yml")
if [ -z "$is_file" ]; then
    echo "Docker compose file not found"
    exit 1
fi

# Check if postgres is running, if not start it
if [ "$(docker ps -q -f name=postgres_free9ja)" = "" ]; then

  # check if there is already a postgres container
  if [ ! "$(docker ps -aq -f name=postgres_free9ja)" = "" ]; then
    docker-compose -f $is_file start postgres_free9ja
  else
    docker-compose -f $is_file up -d postgres_free9ja
  fi
fi


# Check if redis is running
if [ "$(docker ps -q -f name=redis_free9ja)" = "" ]; then

  # check if there is already a redis container
  if [ ! "$(docker ps -aq -f name=redis_free9ja)" = "" ]; then
    docker-compose -f $is_file start redis_free9ja
  else
    docker-compose -f $is_file up -d redis_free9ja
  fi
fi

if [ "$(docker ps -q -f name=postgres_free9ja)" != "" ]; then
    echo "Postgres docker container is running"
  else
    echo "Postgres container not running, please check to see if the docker engine is running"
    exit 1
fi

if [ "$(docker ps -q -f name=redis_free9ja)" != "" ]; then
    echo "Redis docker container is running"
  else
    echo "Redis container not running, please check to see if the docker engine is running"
    exit 1
fi

