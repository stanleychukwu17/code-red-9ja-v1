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
- **Turborepo**: Monorepo Management

## 📜 Available Scripts

- `npm run dev`: Generates Swagger docs and starts the Go server.
- `npm run build`: Compiles the API into a binary in `bin/api`.
- `make build`: Alternative build command using Makefile.
- `make test`: Runs Go tests.
