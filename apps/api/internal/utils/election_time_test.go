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

func TestNextLagosMidnight(t *testing.T) {
	for _, tc := range []struct{ now, want string }{
		{"2026-10-20T12:00:00Z", "2026-10-20T23:00:00Z"},
		{"2026-10-20T22:59:59Z", "2026-10-20T23:00:00Z"},
		{"2026-10-20T23:00:00Z", "2026-10-21T23:00:00Z"},
		{"2026-12-31T23:30:00Z", "2027-01-01T23:00:00Z"},
		{"2028-02-28T23:30:00Z", "2028-02-29T23:00:00Z"},
	} {
		t.Run(tc.now, func(t *testing.T) {
			now, _ := time.Parse(time.RFC3339, tc.now)
			want, _ := time.Parse(time.RFC3339, tc.want)
			got := NextLagosMidnight(now)
			if !got.Equal(want) {
				t.Fatalf("got %s, want %s", got, want)
			}
		})
	}
}
