#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

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

sleep 1 # wait for 1second

# seed celebrities
echo "Seeding celebrities to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1.3-celebrities.json"

sleep 1 # wait for 1 second

# seed 10k users
echo "Seeding 10k users to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1.4-10kusers.json"

sleep 5 # wait for 5 second

# seed admins
echo "Seeding admins and party roles to ${BASE_URL}/api/v1/seed/admins..."
curl -X POST ${BASE_URL}/api/v1/seed/admins \
  -H "Content-Type: application/json" \
  -d @"1.5-admins.json"

sleep 1 # wait for 1 second

# seed superadmins
echo "Seeding superadmins to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1.6-superadmins.json"

echo ""
echo "Done."


