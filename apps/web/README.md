# Free9ja Web Application (`apps/web`)

A modern, highly responsive web dashboard for the **Free9ja** platform. It provides electoral candidate tracking, real-time community feeds, state-by-state analytics, polling unit monitoring, and user management.

## Tech Stack

This project is built using:
- **Core**: React 19 & TypeScript
- **Framework**: [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router) (file-based routing)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)
- **Test Runner**: [Vitest](https://vitest.dev/)

---

## Getting Started

To run this application locally, use the following commands:

```bash
# Install dependencies
npm install

# Start the local development server (runs on port 3001)
npm run dev
```

> [!NOTE]
> Since this is a monorepo, you can also use `pnpm` workspace commands, but standard `npm` commands inside the `apps/web` directory are fully supported.

---

## Core Scripts & Commands

The following commands are available for development, testing, and production:

### Development & Production
*   **Start Dev Server**: `npm run dev` (or `npm run dev:live` to expose to the local network)
*   **Build for Production**: `npm run build`
*   **Preview Production Build**: `npm run preview`

### Testing
*   **Run Unit Tests**: `npm run test` (uses Vitest)

### Linting & Formatting
*   **Lint Code**: `npm run lint` (uses Biome)
*   **Auto-format Code**: `npm run format` (uses Biome)
*   **Check Code**: `npm run check` (runs Biome checks)
*   **Type Check**: `npm run check-types` (runs TypeScript compilation check)

---

## Application Structure & Features

The application structure is organized as follows:

*   **`src/routes/`**: Contains the file-based routes for TanStack Router:
    *   `index.tsx`: Landing / home page.
    *   `_authenticated/`: Sub-routes protected by authentication:
        *   `dashboard/`: Main workspace/metrics dashboard.
        *   `feed/`: Interactive community updates feed.
        *   `candidates/`: Candidate listings and profiles.
        *   `polling-unit/`: Polling unit monitoring.
        *   `states/`: State-by-state electoral insights.
        *   `app-users/`: Management of platform users.
        *   `profile/`: User settings and personalization.
        *   `notifications/`: Real-time alerts and user activities.
        *   `search/`: Site-wide search page.
*   **`src/components/`**: Reusable React components (e.g., `Header`, `Footer`, `ThemeToggle`).
*   **`src/redux/`**: Global state management configuration and slices.
*   **`src/lib/`**: Helper utilities, authentication logic (`auth.ts`), and site preferences.

---

## Deployment & Dockerization

The web application is containerized using Docker. To build and run the Docker image locally:

```bash
docker build -t free9ja-web .
docker run -p 3001:3001 free9ja-web
```

The application is deployed as part of the Free9ja infrastructure. See the root `terraform/` directory for deployment configurations.
