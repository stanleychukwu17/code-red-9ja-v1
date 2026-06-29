# Free9ja Admin Dashboard (`apps/admin`)

The central administrative interface for the **Free9ja** platform. It provides tools for platform administrators to manage users, monitor system health, moderate content, and configure platform-wide settings.

## 🚀 Tech Stack

This project is built using:
- **Core**: React 19 & TypeScript
- **Framework**: [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)
- **Test Runner**: [Vitest](https://vitest.dev/)

---

## 🛠 Getting Started

To run this application locally, use the following commands:

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

> [!NOTE]
> Since this is a monorepo, you can also use `pnpm` workspace commands, but standard `npm` commands inside the `apps/admin` directory are fully supported.

---

## 📜 Core Scripts & Commands

The following commands are available for development, testing, and production:

### Development & Production
*   **Start Dev Server**: `npm run dev`
*   **Build for Production**: `npm run build`
*   **Preview Production Build**: `npm run preview`

### Testing
*   **Run Unit Tests**: `npm run test` (uses Vitest)

### Linting & Formatting
*   **Lint Code**: `npm run lint` (uses Biome)
*   **Auto-format Code**: `npm run format` (uses Biome)
*   **Check Code**: `npm run check` (runs Biome checks)

---

## 🐳 Deployment & Dockerization

The administrative dashboard is containerized using Docker. For detailed information on Docker deployment, please see [DOCKER_GUIDE.md](./DOCKER_GUIDE.md).

To build and run the Docker image locally:

```bash
docker build -t free9ja-admin .
docker run -p 3000:3000 free9ja-admin
```
