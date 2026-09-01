package realtime

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/pusher/pusher-http-go/v5"
)

// Event name constants
const (
	EventResultsUpdated   = "results-updated"
	EventPUResultUploaded = "pu-result-uploaded"
)

// ResultsUpdatedEvent represents a lightweight signal that election rollup results have updated.
type ResultsUpdatedEvent struct {
	ElectionID            int64     `json:"election_id"`
	Scope                 string    `json:"scope"` // "ward", "lga", "state_constituency", "federal_constituency", "senatorial_district", "state", "nationwide"
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
	ElectionID    int64     `json:"election_id"`
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
}

// Channel generator helpers
func ElectionChannel(electionID int64) string {
	return fmt.Sprintf("election-%d", electionID)
}

func ElectionStateChannel(electionID int64, stateID int16) string {
	return fmt.Sprintf("election-%d-state-%d", electionID, stateID)
}

func ElectionLGAChannel(electionID int64, lgaID int32) string {
	return fmt.Sprintf("election-%d-lga-%d", electionID, lgaID)
}

func ElectionWardChannel(electionID int64, wardID int32) string {
	return fmt.Sprintf("election-%d-ward-%d", electionID, wardID)
}

func ElectionPUChannel(electionID int64, puID int32) string {
	return fmt.Sprintf("election-%d-pu-%d", electionID, puID)
}

func ElectionStateConstituencyChannel(electionID int64, scID int32) string {
	return fmt.Sprintf("election-%d-sc-%d", electionID, scID)
}

func ElectionFederalConstituencyChannel(electionID int64, fcID int32) string {
	return fmt.Sprintf("election-%d-fc-%d", electionID, fcID)
}

func ElectionSenatorialDistrictChannel(electionID int64, sdID int32) string {
	return fmt.Sprintf("election-%d-sd-%d", electionID, sdID)
}

// PusherBroadcaster implements Broadcaster via Pusher protocol (works with Pusher SaaS and Soketi/Centrifugo).
type PusherBroadcaster struct {
	client *pusher.Client
}

// NewPusherBroadcaster creates a new Pusher broadcaster instance.
func NewPusherBroadcaster(client *pusher.Client) *PusherBroadcaster {
	return &PusherBroadcaster{client: client}
}

// BroadcastResultsUpdated broadcasts results-updated events to the appropriate channels.
func (p *PusherBroadcaster) BroadcastResultsUpdated(ctx context.Context, event ResultsUpdatedEvent) error {
	if p.client == nil {
		return nil
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	var channels []string

	// Always broadcast to the general election channel for national views
	channels = append(channels, ElectionChannel(event.ElectionID))

	// Add scope-specific channels
	if event.StateID != nil && *event.StateID > 0 {
		channels = append(channels, ElectionStateChannel(event.ElectionID, *event.StateID))
	}
	if event.LGAID != nil && *event.LGAID > 0 {
		channels = append(channels, ElectionLGAChannel(event.ElectionID, *event.LGAID))
	}
	if event.WardID != nil && *event.WardID > 0 {
		channels = append(channels, ElectionWardChannel(event.ElectionID, *event.WardID))
	}
	if event.StateConstituencyID != nil && *event.StateConstituencyID > 0 {
		channels = append(channels, ElectionStateConstituencyChannel(event.ElectionID, *event.StateConstituencyID))
	}
	if event.FederalConstituencyID != nil && *event.FederalConstituencyID > 0 {
		channels = append(channels, ElectionFederalConstituencyChannel(event.ElectionID, *event.FederalConstituencyID))
	}
	if event.SenatorialDistrictID != nil && *event.SenatorialDistrictID > 0 {
		channels = append(channels, ElectionSenatorialDistrictChannel(event.ElectionID, *event.SenatorialDistrictID))
	}

	// Trigger batch or multi-channel
	if len(channels) > 0 {
		err := p.client.TriggerMulti(channels, EventResultsUpdated, event)
		if err != nil {
			slog.Warn("Failed to broadcast results-updated pusher event", "channels", channels, "err", err)
			return err
		}
		slog.Debug("Broadcasted results-updated pusher event", "channels", channels, "scope", event.Scope)
	}

	return nil
}

// BroadcastPUResultUploaded broadcasts pu-result-uploaded events to PU and Ward channels.
func (p *PusherBroadcaster) BroadcastPUResultUploaded(ctx context.Context, event PUResultUploadedEvent) error {
	if p.client == nil {
		return nil
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	channels := []string{
		ElectionPUChannel(event.ElectionID, event.PollingUnitID),
		ElectionWardChannel(event.ElectionID, event.WardID),
	}

	err := p.client.TriggerMulti(channels, EventPUResultUploaded, event)
	if err != nil {
		slog.Warn("Failed to broadcast pu-result-uploaded pusher event", "channels", channels, "err", err)
		return err
	}
	slog.Debug("Broadcasted pu-result-uploaded pusher event", "channels", channels, "pu_id", event.PollingUnitID)

	return nil
}

// NoOpBroadcaster is a fallback broadcaster that performs no operations (useful when Pusher is disabled/unconfigured).
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

// NewBroadcasterFromEnv initializes a Broadcaster based on environment variables.
// If PUSHER_APP_ID or PUSHER_KEY is not configured, it safely returns a NoOpBroadcaster.
func NewBroadcasterFromEnv() Broadcaster {
	appID := strings.TrimSpace(os.Getenv("PUSHER_APP_ID"))
	key := strings.TrimSpace(os.Getenv("PUSHER_KEY"))
	secret := strings.TrimSpace(os.Getenv("PUSHER_SECRET"))
	cluster := strings.TrimSpace(os.Getenv("PUSHER_CLUSTER"))
	host := strings.TrimSpace(os.Getenv("PUSHER_HOST"))
	secureStr := strings.TrimSpace(os.Getenv("PUSHER_SECURE"))

	if appID == "" || key == "" || secret == "" {
		slog.Info("PUSHER_APP_ID/KEY/SECRET not set — using NoOpBroadcaster for WebSockets")
		return NewNoOpBroadcaster()
	}

	client := &pusher.Client{
		AppID:  appID,
		Key:    key,
		Secret: secret,
	}

	if cluster != "" {
		client.Cluster = cluster
	}

	if host != "" {
		client.Host = host
	}

	if secureStr == "false" || secureStr == "0" {
		client.Secure = false
	} else {
		client.Secure = true
	}

	slog.Info("Initialized Pusher real-time broadcaster", "app_id", appID, "cluster", cluster, "host", host)
	return NewPusherBroadcaster(client)
}
