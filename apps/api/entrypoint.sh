#!/bin/sh
# the entrypoint is used only for ci-cd, when deploying to (production||staging)
# it is used in the docker image
set -e

# i asked gemini if this "RUN_MIGRATIONS" is needed at all?
# Answer from gemini:
# It's a great question! You could remove it and just run migrations every single time the container starts,
# but having RUN_MIGRATIONS as an explicit flag is actually considered a best practice in containerized environments like ECS.
# 
# Here is why you probably want to keep it
# 1. Auto-scaling events: Right now, you're running 1 desired task. But let's say your app gets popular and ECS auto-scales
#   from 2 to 10 tasks to handle a traffic spike. If migrations run on startup, those 8 new tasks will all try to run
#   database migrations at the exact same time. Even though goose uses database locks to prevent corruption, this
#   slows down your container startup time when you need it to be fast, and it puts unnecessary lock contention on
#   your database.
#
# 2. Worker/Cron Containers: If you ever decide to run a background worker (e.g., processing email queues) or a cron job
#    using this same Docker image, you definitely don't want those worker containers running database migrations.
#    You'd pass RUN_MIGRATIONS=false to them and only let your main API tasks handle it.
#
# 3. Dedicated Migration Tasks: In more advanced CI/CD pipelines, teams often run a single, short-lived ECS task purely for
#    migrations. Once that task finishes successfully, the pipeline updates the main API service (with RUN_MIGRATIONS=false).
#    This prevents your API containers from crashing in a loop if a migration is faulty.
#
# 4. Read-Only Replicas: In some architectures, you might run read-only replicas of your database. You would definitely
#    want to disable migrations on those instances to prevent them from trying to write to the database.
#
# The Verdict: If you want to keep your setup extremely simple right now and you don't plan on auto-scaling or running
#  workers anytime soon, you can absolutely remove the "if [ "$RUN_MIGRATIONS" = "true" ]; then" block from your entrypoint.sh
#  and delete the variable from Terraform.
#  However, since you've already done the hard work of setting the flag up in Terraform and your scripts, I highly recommend
#  leaving it! It gives you flexibility and protects your database as your application scales.
# 

# Run database migrations if requested
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  
  # Default SSL mode to disable if not specified
  DB_SSLMODE=${DB_SSLMODE:-disable}
  
  # Format DSN for goose
  DB_DSN="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
  
  # Run goose migrations
  goose -dir /app/db/migrations postgres "$DB_DSN" up
fi

echo "Starting application..."
# Start the Go server
exec /app/api
