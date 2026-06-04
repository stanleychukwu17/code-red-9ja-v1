# --- Stage 1: Build ---
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build tools and CA certificates
RUN apk add --no-cache git ca-certificates tzdata

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api ./cmd/api

# Install goose CLI for migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# --- Stage 2: Runtime ---
FROM alpine:3.20 AS runner

WORKDIR /app

# Install ca-certificates and tzdata for SSL connections and timezone support
RUN apk add --no-cache ca-certificates tzdata

# Copy built binary, goose, migrations, and entrypoint script
COPY --from=builder /app/bin/api /app/api
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /app/db/migrations /app/db/migrations
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

# Normalize CRLF line endings to LF to prevent shell execution errors on Linux
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENV PORT=4000
ENV ENV=production
EXPOSE 4000

ENTRYPOINT ["/app/entrypoint.sh"]
