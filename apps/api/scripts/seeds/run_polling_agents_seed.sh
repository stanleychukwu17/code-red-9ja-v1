#!/bin/bash

# Navigate to the directory where the script is located
cd "$(dirname "$0")" || exit 1

BASE_URL="http://localhost:4100"

# Seed party agent applications
echo "Seeding party agent applications to ${BASE_URL}/api/v1/seed/party-agent-applications..."
curl -X POST "${BASE_URL}/api/v1/seed/party-agent-applications" \
  -H "Content-Type: application/json" \
  -d @"polling_agents.json"

echo ""
echo "Done."
