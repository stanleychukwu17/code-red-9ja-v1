package electionsservice

import (
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"time"
)

func electionDetails(election queries.Election, now time.Time) queries.ElectionDetails {
	return queries.ElectionDetails{
		Election: election,
		Status:   utils.ElectionStatusForDate(election.ElectionDate.Time, now),
	}
}
