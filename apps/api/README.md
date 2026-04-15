# Free9ja API

The backend API for the Free9ja platform, built with Go and the [Chi](https://github.com/go-chi/chi) router.

## 🚀 Getting Started

### Prerequisites

- [Go](https://golang.org/doc/install) (1.26+)
- [PostgreSQL](https://www.postgresql.org/) (15+)
- [swag](https://github.com/swaggo/swag) CLI (for documentation generation)
- [air](https://github.com/air-verse/air) (for live reloading)
- [goose](https://github.com/pressly/goose) (for database migrations)
- [sqlc](https://github.com/sqlc-dev/sqlc) (for type-safe SQL)
- [gopls](https://pkg.go.dev/golang.org/x/tools/gopls) (Go language server)

```bash
go install github.com/swaggo/swag/cmd/swag@latest
go install github.com/air-verse/air@latest
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install golang.org/x/tools/gopls@latest
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
| `DATABASE_URL` | - | PostgreSQL connection string (e.g., `postgres://user:pass@localhost:5432/dbname`). |

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

- `cmd/api/`: Entry point of the application (`main.go`).
- `db/`: Database related files.
  - `migrations/`: SQL migration files (Goose).
  - `query/`: SQL query definitions (Sqlc).
- `internal/`: Internal application logic.
  - `config/`: Configuration management.
  - `db/`: Database connection and pooling.
  - `handler/`: HTTP handlers.
  - `logger/`: Structured logging setup.
  - `router/`: Chi router configuration.
- `docs/`: Generated Swagger documentation.
- `scripts/`: Helper scripts for development.
- `bin/`: Compiled binaries.

- **Go**: Language
- **Chi**: HTTP Router
- **pgx**: PostgreSQL Driver & Toolkit
- **Goose**: Database Migrations
- **Sqlc**: Type-Safe SQL Generator
- **swaggo/swag**: Swagger Documentation
- **lmittmann/tint**: Colorized slog handler
- **Turborepo**: Monorepo Management

## 📜 Available Scripts

- `npm run dev`: Generates Swagger docs and starts the Go server.
- `npm run build`: Compiles the API into a binary in `bin/api`.
- `make build`: Alternative build command using Makefile.
- `make test`: Runs Go tests.

## 🗄 Database Management

The project uses **Goose** for migrations and **Sqlc** for generating type-safe code from SQL.

### Common Commands

- **Run Migrations**: `goose -dir db/migrations up`
- **Rollback Migration**: `goose -dir db/migrations down`
- **Generate SQL Code**: `sqlc generate`

For more detailed information on database setup and PostgreSQL-specific notes, see [DATABASE.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/DATABASE.md).

## 📦 Building for Production

When building for production, you should pass the version and commit SHA using `ldflags`:

```bash
go build -ldflags=" \
  -X 'main.version=${VERSION}' \
  -X 'main.commit=${COMMIT_SHA}' \
" -o bin/api ./cmd/api
```

This ensures that the correct version and commit are reported in the logs and via API endpoints.
