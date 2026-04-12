# Docker Deployment Guide for EC2

This guide explains how to build and deploy your TanStack Start web application to an EC2 instance using Docker and Nitro.

## Prerequisites
*   Docker installed on your local machine and EC2.
*   Node.js and pnpm installed locally for testing.

## 1. Building the Docker Image
Since this is a monorepo, you must run the `docker build` command from the **root** of the project, even though the Dockerfile is inside `apps/web`.

Run this command from the project root:
```bash
docker build -t free9ja-web -f apps/web/Dockerfile .
```

## 2. Running Locally for Testing
You can verify the image works locally before pushing to EC2:

```bash
docker run -p 3000:3000 free9ja-web
```
Then visit `http://localhost:3000`.

## 3. Deploying to EC2
1.  **Push the image**: Push your image to a registry (like AWS ECR or Docker Hub) or use `docker save/load` to move it to the EC2 instance.
2.  **Run on EC2**:
    ```bash
    docker run -d \
      --name free9ja-web \
      -p 80:3000 \
      --restart always \
      -e NODE_ENV=production \
      free9ja-web
    ```

## Why this works so well:
*   **Nano-scale images**: By using Nitro's `.output`, we don't need to install `node_modules` in the final production image. This reduces your image size by ~90%.
*   **Nitro Engine**: The `node-server` preset we added to your `vite.config.ts` ensures that Nitro handles requests with maximum efficiency on a long-running instance like EC2.
*   **Self-Contained**: The final container has no dependencies on other files in your monorepo once it is built.
