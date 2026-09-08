# Free9ja Monorepo

A full-stack monorepo powering the **Free9ja** civic engagement and election monitoring platform, managed with [Turborepo](https://turborepo.org/) and [pnpm](https://pnpm.io/) workspaces.

---

## 🏛 Repository Structure

### Apps

| Application | Path | Technology Stack | Default Port | Description |
|---|---|---|---|---|
| **Web** | [`apps/web`](./apps/web) | TanStack Start, React 19, Vite, Tailwind CSS v4 | `3101` | Main public web portal for civic engagement, candidate tracking, and feeds. |
| **Admin** | [`apps/admin`](./apps/admin) | TanStack Start, React 19, Vite, Tailwind CSS v4 | `3102` | Platform backoffice dashboard for administrators, moderation, and system settings. |
| **Party Admin** | [`apps/partyadmin`](./apps/partyadmin) | TanStack Start, React 19, Vite, Tailwind CSS v4 | `3103` | Portal for political party administrators, candidate filings, and agent management. |
| **Election Web** | [`apps/election-web`](./apps/election-web) | TanStack Start, React 19, Vite, Tailwind CSS v4 | `3104` | Public real-time election monitoring, live results dashboard, and analytics. |
| **Mobile** | [`apps/mobile`](./apps/mobile) | React Native 0.81, Expo SDK 54, NativeWind v4 | Expo Dev | Cross-platform mobile app for iOS and Android with offline-first polling unit reporting. |
| **API** | [`apps/api`](./apps/api) | Go 1.26, Chi v5, pgx/v5, Redis, Asynq | `4000` | Core backend REST API with live reload via Air, Swagger docs, and background workers. |
| **IP Service** | [`apps/ip-service`](./apps/ip-service) | Go, MaxMind GeoLite2 | `8081` | High-performance geolocation and IP lookup microservice. |

### Packages

| Package | Path | Description |
|---|---|---|
| `@repo/ui` | [`packages/ui`](./packages/ui) | Shared web design system and component library built with Tailwind CSS v4 and Radix/Base UI primitives. |
| `@repo/mobile-ui` | [`packages/mobile-ui`](./packages/mobile-ui) | Shared React Native UI components, design tokens, and SVG icons using NativeWind. |
| `@repo/typescript-config` | [`packages/typescript-config`](./packages/typescript-config) | Shared `tsconfig.json` configurations applied across all TypeScript packages and apps. |

### Additional Modules

- [`ELECTION_GUIDE/`](./ELECTION_GUIDE): Operational guides, electoral hierarchy, agent readiness tests, and collation workflows.
- [`terraform/`](./terraform): Infrastructure-as-Code definitions for AWS deployment (ECS, RDS, VPC, Bastion tunnels).
- [`load-tests/`](./load-tests): k6 load and stress test suites for high-concurrency election scenarios.
- [`INEC/`](./INEC): Datasets, boundary definitions, and data extraction tooling for Nigerian electoral polling units.

---

## 🛠 Tooling & Technologies

- **Monorepo Manager**: [Turborepo](https://turbo.build/) with [pnpm](https://pnpm.io/) workspaces
- **Linting & Formatting**: [Biome](https://biomejs.dev/) for unified, lightning-fast formatting and linting
- **Type Checking**: [TypeScript](https://www.typescriptlang.org/) across all JS/TS projects
- **Database Layer**: PostgreSQL managed with [Goose](https://github.com/pressly/goose) migrations and [sqlc](https://sqlc.dev/) for type-safe Go queries
- **Caching & Background Tasks**: Redis and [Asynq](https://github.com/hibiken/asynq) for asynchronous queue processing
- **Containerization**: Multi-stage [Docker](https://www.docker.com/) containers for local development and cloud production

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** >= 18
- **pnpm** >= 10 (pinned to `pnpm@11.15.0`)
- **Go** >= 1.26
- **Docker & Docker Compose** (for local PostgreSQL & Redis)
- *(Optional for mobile)*: [Expo Go](https://expo.dev/go), Android Studio, or Xcode
- *(Optional for API tools)*:
  ```bash
  go install github.com/air-verse/air@latest
  go install github.com/pressly/goose/v3/cmd/goose@latest
  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
  go install github.com/swaggo/swag/cmd/swag@latest
  ```

---

### Installation

Install JavaScript/TypeScript dependencies across the entire monorepo:

```bash
pnpm install
```

Go modules for `apps/api` and `apps/ip-service` are managed independently via their respective `go.mod` files.

---

### Local Database & Infrastructure Setup

You can set up and run the backend either via the automated startup script or using manual `pnpm` commands:

#### Option A: Automated Backend Startup (Recommended)

The backend includes an all-in-one startup script at [`apps/api/scripts/start-api.sh`](./apps/api/scripts/start-api.sh) that automatically:
1. Checks and autostarts the **IP Service** in the background (`http://localhost:8081`).
2. Spins up the **PostgreSQL** & **Redis** Docker containers (if not already running).
3. Generates SQL queries via **sqlc**.
4. Runs database migrations via **Goose** (`goose up`).
5. Starts the Go API with **Air** live-reload on `http://localhost:4000`.

```bash
# Run the all-in-one backend setup & server
cd apps/api && bash scripts/start-api.sh
```

#### Option B: Manual Monorepo Commands

If you prefer running through Turborepo / root `pnpm` commands, ensure PostgreSQL and Redis are up and migrations have been applied before starting the apps:

```bash
# Start PostgreSQL & Redis containers in detached mode
pnpm --filter api docker:up

# Run database migrations
pnpm --filter api db:migrate

# (Optional) Stop containers when finished
pnpm --filter api docker:down
```

---

### Development Workflow

#### Run All Applications Concurrently

```bash
pnpm dev
# or
turbo run dev
```

#### Run Specific Applications

You can target any specific application using Turborepo filters:

```bash
# Frontend Web Apps
pnpm dev --filter=web            # Web (http://localhost:3101)
pnpm dev --filter=admin          # Admin (http://localhost:3102)
pnpm dev --filter=partyadmin     # Party Admin (http://localhost:3103)
pnpm dev --filter=election-web   # Election Web (http://localhost:3104)

# Backend API
pnpm dev --filter=api            # Go API with Air live reload (http://localhost:4000)

# Mobile App
pnpm --filter mobile start       # Expo dev server
pnpm --filter mobile android     # Launch on Android emulator
pnpm --filter mobile ios         # Launch on iOS simulator

# Geolocation IP Service
cd apps/ip-service && go run main.go
```

---

### Code Generation

When modifying database schemas or API routes:

```bash
# Generate type-safe Go database queries from SQL (sqlc)
pnpm --filter api sqlc:generate

# Generate Swagger API documentation
pnpm --filter api swagger:generate
```

API Swagger documentation is accessible at `http://localhost:4000/swagger/index.html` when the API is running.

---

### Static Checks, Linting & Formatting

```bash
# Lint code across all workspaces
pnpm lint

# Run Biome checks with safe auto-fixes
pnpm check

# Auto-format all files using Biome
pnpm format

# Run TypeScript typechecks
pnpm check-types

# Build all production bundles
pnpm build
```

---

## 🚢 Deployment

- **Frontend Applications**: Packaged with multi-stage Dockerfiles utilizing Nitro and Vite SSR/CSR engines, optimized for containerized cloud deployment (AWS ECS / EC2 / Cloudflare).
- **Backend API**: Multi-stage Go Dockerfile compiling a lean static binary with embedded configurations.
- **Infrastructure**: See [`terraform/`](./terraform) for AWS environment provisioning, RDS databases, and bastion tunnel access guides.

---

## 📚 Useful Links

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [TanStack Start](https://tanstack.com/start/latest)
- [Expo Documentation](https://docs.expo.dev/)
- [Go Chi Router](https://go-chi.io/)
- [sqlc Documentation](https://docs.sqlc.dev/)
- [Biome Documentation](https://biomejs.dev/)
