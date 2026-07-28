#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

echo "Seeding users to ${BASE_URL}/api/v1/seed/users..."

curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @seed_users.json

echo ""
echo "Done."
