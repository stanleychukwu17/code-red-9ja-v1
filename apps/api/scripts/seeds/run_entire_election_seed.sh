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

sleep 1 # wait for 1 second

# seed presidential candidates
echo "Seeding presidential candidates to ${BASE_URL}/api/v1/seed/candidates/presidential..."
curl -X POST ${BASE_URL}/api/v1/seed/candidates/presidential \
  -H "Content-Type: application/json" \
  -d @"production/elections/2027-general-election/presidential.json"

sleep 1 # wait for 1 second

# seed senatorial candidates
# echo "Seeding senatorial candidates to ${BASE_URL}/api/v1/seed/candidates/senate..."
# curl -X POST ${BASE_URL}/api/v1/seed/candidates/senate \
#   -H "Content-Type: application/json" \
#   -d @"production/elections/2027-general-election/senate.json"

sleep 1 # wait for 1 second

# seed house of reps candidates
# echo "Seeding house of representatives candidates to ${BASE_URL}/api/v1/seed/candidates/house-of-reps..."
# curl -X POST ${BASE_URL}/api/v1/seed/candidates/house-of-reps \
#   -H "Content-Type: application/json" \
#   -d @"production/elections/2027-general-election/house_of_representatives.json"

sleep 1 # wait for 1 second

# seed governorship candidates
echo "Seeding governorship candidates to ${BASE_URL}/api/v1/seed/candidates/governorship..."
curl -X POST ${BASE_URL}/api/v1/seed/candidates/governorship \
  -H "Content-Type: application/json" \
  -d @"production/elections/2027-general-election/governorship.json"

sleep 1 # wait for 1 second

# seed state house of assembly candidates
# echo "Seeding state house of assembly candidates to ${BASE_URL}/api/v1/seed/candidates/state-assembly..."
# curl -X POST ${BASE_URL}/api/v1/seed/candidates/state-assembly \
#   -H "Content-Type: application/json" \
#   -d @"production/elections/2027-general-election/state_house_of_assembly.json"

echo ""
echo "Done."
