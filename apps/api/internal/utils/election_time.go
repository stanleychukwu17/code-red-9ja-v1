package utils

import "time"

// Lagos has a fixed UTC+1 offset. Keeping it here also works in minimal images
// and Windows environments without an installed IANA timezone database.
var lagosLocation = time.FixedZone("Africa/Lagos", 60*60)

// LagosDate returns the current Lagos calendar date as a UTC date value for
// PostgreSQL DATE parameters. A scheduled DATE itself has no timezone.
func LagosDate(now time.Time) time.Time {
	local := now.In(lagosLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC)
}

// ElectionStatusForDate derives the API label from the scheduled calendar date.
// An election is ongoing on its scheduled day and on the preceding day.
func ElectionStatusForDate(scheduledDate, now time.Time) string {
	date := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), 0, 0, 0, 0, time.UTC)
	today := LagosDate(now)
	if date.Before(today) {
		return "ended"
	}
	if !date.After(today.AddDate(0, 0, 1)) {
		return "ongoing"
	}
	return "upcoming"
}

// IsElectionNominationOpen returns true if the election is scheduled more than 15 days from today in Lagos calendar time.
func IsElectionNominationOpen(scheduledDate, now time.Time) bool {
	date := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), 0, 0, 0, 0, time.UTC)
	today := LagosDate(now)
	deadline := today.AddDate(0, 0, 15)
	return date.After(deadline)
}
