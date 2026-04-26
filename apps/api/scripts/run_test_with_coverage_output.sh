#!/bin/bash

go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
go tool cover -func=coverage.out

# go test -count=1 -v -coverprofile=coverage.out ./... # to disable cache
# go tool cover -html=coverage.out -o coverage.html
# go tool cover -func=coverage.out