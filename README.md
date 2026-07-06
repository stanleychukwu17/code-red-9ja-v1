# free9ja Monorepo

This repository is a fullstack monorepo managed by [Turborepo](https://turborepo.org/) and [pnpm](https://pnpm.io/) workspaces.

## Structure

### Apps

- `apps/web`: The main web frontend application built with **[TanStack Start](https://tanstack.com/start)**, React, Vite, and Tailwind CSS v4. It features a multi-stage `Dockerfile` and is optimized for deployment to AWS EC2 using a Nitro server engine.
- `apps/api`: The backend API written in **Go**. It utilizes `go-chi/chi` for routing, `swaggo/swag` for API documentation, and `lmittmann/tint` coupled with `slog` for rich, optimized logger outputs (including commit and version details). It supports live reloading via `air`.

### Packages

- `@repo/ui`: A shared React component library for the frontend.
- `@repo/typescript-config`: Shared `tsconfig.json` configurations used throughout the monorepo.

## Tooling

This monorepo has some additional tools configured:

- [Biome](https://biomejs.dev/) for unified extremely fast linting and formatting.
- [TypeScript](https://www.typescriptlang.org/) for static type checking across JS/TS applications.
- [Docker](https://www.docker.com/) for production-ready containerization.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Go >= 1.26
- (Optional) Docker for running containerized builds locally

### Installation

Install JavaScript dependencies with pnpm:

```sh
pnpm install
```

The Go API manages its dependencies via `go mod` within `apps/api/`.

### Development

To start the development servers for all apps synchronously, run the following from the root directory:

```sh
pnpm dev
# or
turbo run dev
```

- **Frontend (`web`)**: Starts Vite dev server.
- **Backend (`api`)**: Starts Go server with `air` dev server for hot reloads.

You can also run tasks for specific apps:

```sh
turbo run dev --filter=web
```

### Static Checks and Linting

Run Biome formatting and linting:

```sh
pnpm lint
pnpm check
pnpm format
```

Run TypeScript checks:

```sh
pnpm check-types
```

## Deployment

### Deploying the Web App

The frontend is configured with a robust Dockerfile meant for AWS EC2 deployments using standard container workflows.

For more information, please see `apps/web/DOCKER_GUIDE.md`.

## Useful Links

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [TanStack Start](https://tanstack.com/start/latest)
- [Go Chi Router](https://go-chi.io/)
