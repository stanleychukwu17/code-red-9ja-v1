#!/bin/bash

# Navigate to the directory where seed_users.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

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
