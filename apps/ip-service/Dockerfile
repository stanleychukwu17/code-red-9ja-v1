# Build stage
FROM golang:1.26.4-alpine3.24 AS builder

# Set the working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go app
# CGO_ENABLED=0 ensures we build a statically linked binary for alpine
RUN CGO_ENABLED=0 GOOS=linux go build -o ip-service .

# Final stage
FROM alpine:3.20

# Add ca-certificates in case we need to make HTTPS calls
RUN apk --no-cache add ca-certificates

# Create user and group for non-root execution
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

# Copy the Pre-built binary file from the previous stage
COPY --from=builder --chown=app:app /app/ip-service .

# Copy the GeoIP database from the builder stage
COPY --from=builder --chown=app:app /app/GeoLite2-City.mmdb .

# Switch to the non-root user
USER app

# Expose port 8081 to the outside world
EXPOSE 8081

# Command to run the executable
CMD ["./ip-service"]
