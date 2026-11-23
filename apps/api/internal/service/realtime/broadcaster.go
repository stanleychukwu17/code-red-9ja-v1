package realtime

import (
	"context"
	"fmt"
	"time"
)

// Event name constants
const (
	EventResultsUpdated        = "results-updated"
	EventPUResultUploaded      = "pu-result-uploaded"
	EventNewNotification       = "new-notification"
	EventNewPartyNotification  = "new-party-notification"
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

// ResultsUpdatedEvent represents a lightweight signal that election rollup results have updated.
type ResultsUpdatedEvent struct {
	ElectionID            int32     `json:"election_id"`
	Scope                 string    `json:"scope"` // "ward", "lga", "state-constituency", "federal-constituency", "senatorial-district", "state", "nationwide"
	StateID               *int16    `json:"state_id,omitempty"`
	LGAID                 *int32    `json:"lga_id,omitempty"`
	WardID                *int32    `json:"ward_id,omitempty"`
	StateConstituencyID   *int32    `json:"state_constituency_id,omitempty"`
	FederalConstituencyID *int32    `json:"federal_constituency_id,omitempty"`
	SenatorialDistrictID  *int32    `json:"senatorial_district_id,omitempty"`
	Timestamp             time.Time `json:"timestamp"`
}

// PUResultUploadedEvent represents a notification that a polling unit result was uploaded/updated.
type PUResultUploadedEvent struct {
	ElectionID    int32     `json:"election_id"`
	PollingUnitID int32     `json:"polling_unit_id"`
	WardID        int32     `json:"ward_id"`
	LGAID         int32     `json:"lga_id"`
	StateID       int16     `json:"state_id"`
	ValidVotes    int32     `json:"valid_votes"`
	Timestamp     time.Time `json:"timestamp"`
}

// Broadcaster is the interface for real-time WebSocket messaging.
type Broadcaster interface {
	BroadcastResultsUpdated(ctx context.Context, event ResultsUpdatedEvent) error
	BroadcastPUResultUploaded(ctx context.Context, event PUResultUploadedEvent) error
	BroadcastNotification(ctx context.Context, userID int64, data any) error
	BroadcastPartyNotification(ctx context.Context, partyID int16, chapterID *int32, data any) error
}

// Channel generator helpers
func ElectionChannel(electionID int32) string {
	return fmt.Sprintf("election-%d", electionID)
}

func ElectionStateChannel(electionID int32, stateID int16) string {
	return fmt.Sprintf("election-%d-state-%d", electionID, stateID)
}

func ElectionLGAChannel(electionID int32, lgaID int32) string {
	return fmt.Sprintf("election-%d-lga-%d", electionID, lgaID)
}

func ElectionWardChannel(electionID int32, wardID int32) string {
	return fmt.Sprintf("election-%d-ward-%d", electionID, wardID)
}

func ElectionPUChannel(electionID int32, puID int32) string {
	return fmt.Sprintf("election-%d-pu-%d", electionID, puID)
}

func ElectionStateConstituencyChannel(electionID int32, scID int32) string {
	return fmt.Sprintf("election-%d-sc-%d", electionID, scID)
}

func ElectionFederalConstituencyChannel(electionID int32, fcID int32) string {
	return fmt.Sprintf("election-%d-fc-%d", electionID, fcID)
}

func ElectionSenatorialDistrictChannel(electionID int32, sdID int32) string {
	return fmt.Sprintf("election-%d-sd-%d", electionID, sdID)
}

// NoOpBroadcaster is a fallback broadcaster that performs no operations when no realtime broker is configured.
type NoOpBroadcaster struct{}

func NewNoOpBroadcaster() *NoOpBroadcaster {
	return &NoOpBroadcaster{}
}

func (n *NoOpBroadcaster) BroadcastResultsUpdated(ctx context.Context, event ResultsUpdatedEvent) error {
	return nil
}

func (n *NoOpBroadcaster) BroadcastPUResultUploaded(ctx context.Context, event PUResultUploadedEvent) error {
	return nil
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
