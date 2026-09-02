#!/bin/bash

# Navigate to the directory where the script is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4000"

# Flush Redis cache
echo "Flushing Redis database at ${BASE_URL}/api/v1/seed/flush-redis..."
curl -X POST "${BASE_URL}/api/v1/seed/flush-redis" \
  -H "Content-Type: application/json"

echo ""
echo "Done."
