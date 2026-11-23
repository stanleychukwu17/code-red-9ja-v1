package realtime

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNotificationChannelHelpers(t *testing.T) {
	assert.Equal(t, "user-42", UserChannel(42))
	assert.Equal(t, "party-7", PartyChannel(7))
	assert.Equal(t, "party-7-chapter-12", PartyChapterChannel(7, 12))
}

func TestNoOpBroadcaster(t *testing.T) {
	b := NewNoOpBroadcaster()
	ctx := context.Background()

	err := b.BroadcastNotification(ctx, 1, map[string]string{"msg": "ok"})
	assert.NoError(t, err)

	err = b.BroadcastPartyNotification(ctx, 1, nil, map[string]string{"msg": "ok"})
	assert.NoError(t, err)
}

func TestNewBroadcasterFromEnv_NoEnv(t *testing.T) {
	// Without env set, should safely return NoOpBroadcaster
	b := NewBroadcasterFromEnv()
	assert.NotNil(t, b)
	_, ok := b.(*NoOpBroadcaster)
	assert.True(t, ok)
}
