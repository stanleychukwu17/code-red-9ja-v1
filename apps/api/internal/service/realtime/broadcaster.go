package realtime

import (
	"context"
	"fmt"
)

// Event name constants
const (
	EventNewNotification      = "new-notification"
	EventNewPartyNotification = "new-party-notification"
)

// Channel generator helpers for notifications
func UserChannel(userID int64) string {
	return fmt.Sprintf("user-%d", userID)
}

func PartyChannel(partyID int16) string {
	return fmt.Sprintf("party-%d", partyID)
}

func PartyChapterChannel(partyID int16, chapterID int32) string {
	return fmt.Sprintf("party-%d-chapter-%d", partyID, chapterID)
}

// Broadcaster is the interface for real-time WebSocket messaging.
type Broadcaster interface {
	BroadcastNotification(ctx context.Context, userID int64, data any) error
	BroadcastPartyNotification(ctx context.Context, partyID int16, chapterID *int32, data any) error
}

// NoOpBroadcaster is a fallback broadcaster that performs no operations when no realtime broker is configured.
type NoOpBroadcaster struct{}

func NewNoOpBroadcaster() *NoOpBroadcaster {
	return &NoOpBroadcaster{}
}

func (n *NoOpBroadcaster) BroadcastNotification(ctx context.Context, userID int64, data any) error {
	return nil
}

func (n *NoOpBroadcaster) BroadcastPartyNotification(ctx context.Context, partyID int16, chapterID *int32, data any) error {
	return nil
}

// NewBroadcasterFromEnv initializes the configured realtime Broadcaster.
// Currently returns NoOpBroadcaster until a dedicated broker (e.g. Centrifugo) is wired up.
func NewBroadcasterFromEnv() Broadcaster {
	return NewNoOpBroadcaster()
}
