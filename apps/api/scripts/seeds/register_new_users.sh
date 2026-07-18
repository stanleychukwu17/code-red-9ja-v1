#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

echo "Seeding users to http://localhost:4000/api/v1/auth/seed..."

curl -X POST http://localhost:4000/api/v1/auth/seed \
  -H "Content-Type: application/json" \
  -d @seed_users.json

echo ""
echo "Done."
