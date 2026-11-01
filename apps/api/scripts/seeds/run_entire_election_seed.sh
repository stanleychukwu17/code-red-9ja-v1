#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

# seed stanley
echo "Seeding main user (stanley) to ${BASE_URL}/api/v1/seed/users..."
curl -X POST ${BASE_URL}/api/v1/seed/users \
  -H "Content-Type: application/json" \
  -d @"1-stanley.json"

sleep 1 # wait for 1 second

# seed stanley as superadmin
echo "Seeding superadmin role for stanley to ${BASE_URL}/api/v1/seed/admins..."
curl -X POST ${BASE_URL}/api/v1/seed/admins \
  -H "Content-Type: application/json" \
  -d @"1-stanley-make-super-admin.json"

sleep 1 # wait for 1 second

# seed election groups
echo "Seeding election groups to ${BASE_URL}/api/v1/seed/election-groups..."
curl -X POST ${BASE_URL}/api/v1/seed/election-groups \
  -H "Content-Type: application/json" \
  -d @"production/elections/2027-general-election/election_group.json"

sleep 1 # wait for 1 second

# seed election instances
echo "Seeding election instances to ${BASE_URL}/api/v1/seed/election-instances..."
curl -X POST ${BASE_URL}/api/v1/seed/election-instances \
  -H "Content-Type: application/json" \
  -d @"production/elections/2027-general-election/elections_instance.json"

echo ""
echo "Done."
