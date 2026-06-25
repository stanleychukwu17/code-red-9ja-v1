# IP Service

This is the IP Retrieval Service for free9ja. It provides IP-based geolocation and rate-limiting functionality.

## Local Development

For local development, you can use the provided `docker-compose.yml` to spin up the service along with its Redis dependency.

```bash
docker-compose up -d --build
```

**Note:** Ensure you have the `GeoLite2-City.mmdb` database file in the root of this folder, as the docker-compose file mounts it into the container.

## Environment Variables

When deploying this service, you will need to configure the following environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_ENV` | Sets the application environment. **Must be set to `production` in deployed environments** to avoid loading local `.env` files. | `""` (local) |
| `PORT` | The port the service will listen on. | `8081` |
| `REDIS_ADDR` | The connection string for Redis (e.g., `redis:6379` for compose, or a public URL for Railway). | `localhost:6379` |
| `REDIS_PASSWORD`| The password for your Redis instance, if applicable. | `""` |
| `REDIS_DB` | The Redis logical database to use. | `0` |
| `RATE_LIMIT_REQUESTS`| The number of requests allowed per IP address within the window. | `100` |
| `RATE_LIMIT_WINDOW`| The time window in seconds for the rate limit. | `60` |
| `GEOLITE2_DB_PATH` | The path to the GeoLite2 database file. | `GeoLite2-City.mmdb` |

## Deployment Guidelines

### 🚂 Deploying to Railway

Railway uses Nixpacks or the provided `Dockerfile` to build the application automatically. It will ignore `docker-compose.yml`.

1. Provision a **Redis** service within your Railway project.
2. Deploy the `ip-service` from your GitHub repository.
3. In the Railway dashboard for the `ip-service`, add the following variables:
   - `APP_ENV=production`
   - `REDIS_ADDR=redis.railway.internal:6379` (Use the private TCP URL provided by your Railway Redis service, stripping the `redis://` prefix if necessary).
   - `REDIS_PASSWORD` (If your Railway Redis service generated one).
   - Ensure the `GeoLite2-City.mmdb` file is committed to your repository so Railway includes it in the build context.

### ☁️ Deploying to AWS EC2 / VPS

When deploying to a standard virtual machine, `docker-compose` is the recommended approach.

1. Clone your repository onto the instance.
2. Navigate to this directory (`apps/ip-service`).
3. Set your production environment variables (you can create a local `.env` file just for docker-compose, or export them in your shell).
4. Run:
   ```bash
   APP_ENV=production docker-compose up -d --build
   ```
   *(The docker-compose file automatically applies `APP_ENV=production` for the container).*
