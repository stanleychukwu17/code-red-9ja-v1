# Base image
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Stage 1: Build ---
FROM base AS builder
WORKDIR /app

# Copy lockfile and workspace config first for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all packages and the web app
COPY packages ./packages
COPY apps/web ./apps/web

# Install all dependencies (required for monorepo build)
RUN pnpm install --frozen-lockfile

# Build the web application
RUN pnpm --filter web build

# --- Stage 2: Production ---
FROM node:22-alpine AS runner
WORKDIR /app

# Copy the Nitro output from the builder stage
# Nitro .output is standalone and contains everything needed
COPY --from=builder /app/apps/web/.output ./.output

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
