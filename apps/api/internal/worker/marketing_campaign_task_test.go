package worker

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestMarketingDeductionsLockKey(t *testing.T) {
	// Ensure that the key format is deterministic and based on UTC date
	fixedDate := time.Date(2026, time.September, 19, 14, 30, 0, 0, time.FixedZone("WAT", 3600))
	expected := "cron:lock:marketing_deductions:2026-09-19"

	actual := marketingDeductionsLockKey(fixedDate)
	assert.Equal(t, expected, actual)

	// Ensure boundary rollover to UTC
	lateNight := time.Date(2026, time.September, 19, 23, 30, 0, 0, time.UTC)
	assert.Equal(t, "cron:lock:marketing_deductions:2026-09-19", marketingDeductionsLockKey(lateNight))

	nextDayUTC := time.Date(2026, time.September, 20, 0, 5, 0, 0, time.UTC)
	assert.Equal(t, "cron:lock:marketing_deductions:2026-09-20", marketingDeductionsLockKey(nextDayUTC))
}

func TestCronLockConstants(t *testing.T) {
	assert.Equal(t, "cron:lock:inec_grabber_sync", INECGrabberSyncLockKey)
	assert.Equal(t, 14*time.Minute, INECGrabberSyncLockTTL)
}
