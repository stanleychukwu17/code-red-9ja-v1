package utils

import (
	"net/http"

	"free9ja/api/internal/db/queries"
)

// ValidateAssignmentMatch verifies that an assignment exists, belongs to the expected ID, and matches the polling unit.
func ValidateAssignmentMatch(assignment *queries.GetUserAssignmentRow, expectedAssignmentID int64, expectedPuID int32) (int, string) {
	if assignment == nil || assignment.ID <= 0 {
		return http.StatusNotFound, "No active assignment found for this election group"
	}

	if assignment.ID != expectedAssignmentID {
		return http.StatusForbidden, "Assignment does not belong to you"
	}

	if assignment.PollingUnitID != expectedPuID {
		return http.StatusBadRequest, "Polling unit does not match assignment"
	}

	return 0, ""
}
