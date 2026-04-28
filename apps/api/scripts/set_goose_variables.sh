#!/bin/bash

export DB_NAME=free9ja_db
export DB_USER=postgres
export DB_PASSWORD=password
export DB_HOST=localhost
export DB_PORT=5432

# goose
export GOOSE_DRIVER="postgres"
export GOOSE_DBSTRING="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
