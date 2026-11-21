package utils

import (
	"errors"
	"time"
)

// Lagos has a fixed UTC+1 offset. Keeping it here also works in minimal images
// and Windows environments without an installed IANA timezone database.
var lagosLocation = time.FixedZone("Africa/Lagos", 60*60)

// PostElectionCollationGraceDays defines the grace period (in days) following election day
// to allow offline data synchronization, collation, and reporting.
const PostElectionCollationGraceDays = 5

// LagosDate returns the current Lagos calendar date as a UTC date value for
// PostgreSQL DATE parameters. A scheduled DATE itself has no timezone.
func LagosDate(now time.Time) time.Time {
	local := now.In(lagosLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC)
}

// ElectionStatusForDate derives the API label from the scheduled calendar date.
// An election is upcoming before its date, ongoing on election day and during
// the collation/reporting grace window, and ended thereafter.
func ElectionStatusForDate(scheduledDate, now time.Time) string {
	date := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), 0, 0, 0, 0, time.UTC)
	today := LagosDate(now)

	if today.Before(date) {
		return "upcoming"
	}

	// Election remains ongoing on election day and during the post-election collation window
	if today.After(date.AddDate(0, 0, PostElectionCollationGraceDays)) {
		return "ended"
	}

	return "ongoing"
}

// IsElectionNominationOpen returns true if the election is scheduled more than 15 days from today in Lagos calendar time.
func IsElectionNominationOpen(scheduledDate, now time.Time) bool {
	date := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), 0, 0, 0, 0, time.UTC)
	today := LagosDate(now)

	// Nominations close 15 days before the scheduled election date
	deadline := today.AddDate(0, 0, 15)
	return date.After(deadline)
}

// ValidateElectionReportingWindow checks that an election task or report is being submitted
// on or after the scheduled election day in Lagos calendar time, and within the post-election grace period (for offline sync).
func ValidateElectionReportingWindow(scheduledDate, now time.Time, graceDays int) error {
	date := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), 0, 0, 0, 0, time.UTC)
	today := LagosDate(now)

	if today.Before(date) {
		return errors.New("updates cannot be submitted prior to election day")
	}

	if today.After(date.AddDate(0, 0, graceDays)) {
		return errors.New("the reporting and sync window for this election has ended")
	}

	return nil
}
