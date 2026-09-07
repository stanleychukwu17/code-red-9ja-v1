#!/bin/bash

# Go up from scripts/ to the api/ root where go.mod lives
cd "$(dirname "$0")/.."

echo "Generating Swagger documentation..."

if ! swag init \
  -g main.go \
  --parseDependency \
  --parseInternal \
  -d ./cmd/api,./internal/router,./internal/service/seed,./internal/handler/seed,./internal/handler/auth,./internal/handler/parties,./internal/handler/files,./internal/handler/offices,./internal/handler/election_groups,./internal/handler/elections,./internal/handler/users,./internal/handler/polling_unit_assignments,./internal/handler/party_applications,./internal/handler/bodies,./internal/handler/federal_constituencies,./internal/handler/polling_units,./internal/handler/senatorial_districts,./internal/handler/state_constituencies,./internal/handler/states,./internal/handler/wards,./internal/handler/polling_unit_updates,./internal/handler/system_settings,./internal/handler/practice_tests,./internal/handler/page_verifications,./internal/db/queries,./internal/handler/referrals,./internal/handler/inec_grabber,./internal/handler/election_results \
  -o docs; then
    echo "Swagger generation failed."
    exit 1
fi

echo "Swagger documentation generated successfully!"
