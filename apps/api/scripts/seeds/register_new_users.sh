#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4000"

# seed users
echo "Seeding users to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1-users.json"

sleep 5 # wait for 5seconds

# seed politicians
echo "Seeding politicians to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1.2-politicians.json"

sleep 1 # wait for 2seconds

# seed celebrities
echo "Seeding celebrities to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1.3-celebrities.json"

echo ""
echo "Done."
