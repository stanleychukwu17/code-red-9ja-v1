# Free9ja API

The backend API for the Free9ja platform, built with Go and the [Chi](https://github.com/go-chi/chi) router.

## 🚀 Getting Started

### Prerequisites

- [Go](https://golang.org/doc/install) (1.20+)
- [swag](https://github.com/swaggo/swag) CLI (for documentation generation)

```bash
go install github.com/swaggo/swag/cmd/swag@latest
```

### Installation

Install dependencies:

```bash
go mod tidy
```

### Running the API

To start the API in development mode (includes automatic Swagger documentation generation):

```bash
npm run dev
# OR run the script directly
./scripts/start-api.sh
```

The server will start at [http://localhost:4000](http://localhost:4000) by default.

### Environment Variables

The application can be configured using the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | The port the server will listen on (required). |
| `ENV` | `development` | Environment mode (`development` or `production`). |

## 📝 Logging

The API uses structured logging with [slog](https://pkg.go.dev/log/slog).

- **In Development**: Uses [tint](https://github.com/lmittmann/tint) for beautiful, colorized output to `stdout`.
- **In Production**: Uses standard JSON output for easy parsing by log aggregators (e.g., ELK, Datadog). Version and commit information are automatically attached to all logs in production.

## 📖 Documentation

The API uses Swagger for documentation. You can view the interactive API docs at:

[http://localhost:4000/swagger/index.html#/](http://localhost:4000/swagger/index.html#/) (in development mode)

### Generating Documentation

Documentation is automatically generated when running `npm run dev`. To generate it manually, use:

```bash
./scripts/generate-swagger.sh
```

## 🏗 Project Structure

- `cmd/api/`: Entry point of the application (`main.go`).
- `internal/`: Internal application logic.
  - `handler/`: HTTP handlers.
  - `router/`: Router configuration.
- `docs/`: Generated Swagger documentation.
- `scripts/`: Helper scripts for development.
- `bin/`: Compiled binaries.

## 🛠 Tech Stack

- **Go**: Language
- **Chi**: HTTP Router
- **swaggo/swag**: Swagger Documentation
- **lmittmann/tint**: Colorized slog handler
- **Turborepo**: Monorepo Management

## 📜 Available Scripts

- `npm run dev`: Generates Swagger docs and starts the Go server.
- `npm run build`: Compiles the API into a binary in `bin/api`.
- `make build`: Alternative build command using Makefile.
- `make test`: Runs Go tests.

## 📦 Building for Production

When building for production, you should pass the version and commit SHA using `ldflags`:

```bash
go build -ldflags=" \
  -X 'main.version=${VERSION}' \
  -X 'main.commit=${COMMIT_SHA}' \
" -o bin/api ./cmd/api
```

This ensures that the correct version and commit are reported in the logs and via API endpoints.
