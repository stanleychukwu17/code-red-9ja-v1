package realtime

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestChannelHelpers(t *testing.T) {
	assert.Equal(t, "election-1", ElectionChannel(1))
	assert.Equal(t, "election-1-state-2", ElectionStateChannel(1, 2))
	assert.Equal(t, "election-1-lga-15", ElectionLGAChannel(1, 15))
	assert.Equal(t, "election-1-ward-80", ElectionWardChannel(1, 80))
	assert.Equal(t, "election-1-pu-500", ElectionPUChannel(1, 500))
	assert.Equal(t, "election-1-sc-20", ElectionStateConstituencyChannel(1, 20))
	assert.Equal(t, "election-1-fc-12", ElectionFederalConstituencyChannel(1, 12))
	assert.Equal(t, "election-1-sd-4", ElectionSenatorialDistrictChannel(1, 4))
}

func TestNoOpBroadcaster(t *testing.T) {
	b := NewNoOpBroadcaster()
	ctx := context.Background()

	stateID := int16(1)
	err := b.BroadcastResultsUpdated(ctx, ResultsUpdatedEvent{
		ElectionID: 1,
		Scope:      "state",
		StateID:    &stateID,
		Timestamp:  time.Now(),
	})
	assert.NoError(t, err)

	err = b.BroadcastPUResultUploaded(ctx, PUResultUploadedEvent{
		ElectionID:    1,
		PollingUnitID: 10,
		WardID:        2,
		LGAID:         3,
		StateID:       1,
		ValidVotes:    150,
		Timestamp:     time.Now(),
	})
	assert.NoError(t, err)
}

func TestNewBroadcasterFromEnv_NoEnv(t *testing.T) {
	// Without env set, should safely return NoOpBroadcaster
	b := NewBroadcasterFromEnv()
	assert.NotNil(t, b)
	_, ok := b.(*NoOpBroadcaster)
	assert.True(t, ok)
}
