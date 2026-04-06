.PHONY: dev build run test tidy

BIN := bin/api

dev:
	air -c .air.toml

build:
	go build -o $(BIN) ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy
