#!/bin/bash

# Run tests and generate coverage profile
# go test -v -coverprofile=coverage.out ./...
go test -coverprofile=coverage.out ./...

# Filter out generated code from coverage.out
# -v: Invert match (exclude)
# -E: Use extended regular expressions
grep -v -E "internal/db/queries/|docs/" coverage.out > coverage.filtered.out
mv coverage.filtered.out coverage.out

# Generate HTML report
go tool cover -html=coverage.out -o coverage.html

# Show coverage summary in terminal
go tool cover -func=coverage.out