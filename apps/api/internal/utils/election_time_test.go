package utils

import (
	"testing"
	"time"
)

func TestElectionStatusForDate(t *testing.T) {
	for _, tc := range []struct{ scheduled, now, want string }{
		{"2026-10-19", "2026-10-20T12:00:00Z", "ended"},
		{"2026-10-20", "2026-10-20T12:00:00Z", "ongoing"},
		{"2026-10-21", "2026-10-20T12:00:00Z", "ongoing"},
		{"2026-10-22", "2026-10-20T12:00:00Z", "upcoming"},
		{"2026-10-20", "2026-10-20T22:59:59Z", "ongoing"},
		{"2026-10-20", "2026-10-20T23:00:00Z", "ended"},
		{"2026-10-22", "2026-10-20T23:00:00Z", "ongoing"},
		{"2027-01-01", "2026-12-31T12:00:00Z", "ongoing"},
		{"2028-02-29", "2028-02-28T12:00:00Z", "ongoing"},
	} {
		t.Run(tc.scheduled+"/"+tc.now, func(t *testing.T) {
			date, _ := time.Parse("2006-01-02", tc.scheduled)
			now, _ := time.Parse(time.RFC3339, tc.now)
			if got := ElectionStatusForDate(date, now); got != tc.want {
				t.Fatalf("got %s, want %s", got, tc.want)
			}
		})
	}
}
