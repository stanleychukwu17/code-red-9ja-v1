#!/bin/bash

# Navigate to the directory where set_election_group_today.json is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

echo "Updating election group date to today at ${BASE_URL}/api/v1/seed/election-groups/set-today..."
curl -X POST ${BASE_URL}/api/v1/seed/election-groups/set-today \
  -H "Content-Type: application/json" \
  -d @"set_election_group_today.json"

echo ""
