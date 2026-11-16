package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/db/queries"
	campaigngroupsservice "free9ja/api/internal/service/campaign_groups"

	"github.com/hibiken/asynq"
)

// Task name constants
const (
	TaskEnrollAgentInCampaignGroup   = "task:enroll_agent_in_campaign_group"
	TaskRemoveAgentFromCampaignGroup = "task:remove_agent_from_campaign_group"
)

// CampaignGroupsService defines the interface needed by the worker for campaign group operations.
type CampaignGroupsService interface {
	EnsureAgentCampaignInGroup(ctx context.Context, input campaigngroupsservice.EnsureAgentCampaignInGroupInput) (*queries.CampaignGroup, error)
	RemoveUserFromCampaignGroups(ctx context.Context, partyID int16, userID int64) error
}

// EnrollAgentInCampaignGroupPayload contains the parameters to enroll an approved agent or supervisor.
type EnrollAgentInCampaignGroupPayload struct {
	PartyID         int16  `json:"party_id"`
	ElectionGroupID int32  `json:"election_group_id"`
	UserID          int64  `json:"user_id"`
	Role            string `json:"role"`
	StateID         int16  `json:"state_id"`
	LgaID           int32  `json:"lga_id"`
	WardID          int32  `json:"ward_id"`
	PollingUnitID   int32  `json:"polling_unit_id"`
}

// RemoveAgentFromCampaignGroupPayload contains the parameters to remove an agent or supervisor from campaign groups upon revocation.
type RemoveAgentFromCampaignGroupPayload struct {
	PartyID         int16 `json:"party_id"`
	ElectionGroupID int32 `json:"election_group_id"`
	UserID          int64 `json:"user_id"`
}

// DistributeTaskRemoveAgentFromCampaignGroup enqueues a background job to remove a revoked agent/supervisor from party campaign groups.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRemoveAgentFromCampaignGroup(
	ctx context.Context,
	payload *RemoveAgentFromCampaignGroupPayload,
	opts ...asynq.Option,
) error {
	// Serialize task payload to JSON bytes
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal remove agent from campaign group payload: %w", err)
	}

	// Set default retry attempts (5 times) and task run timeout (30s)
	defaults := []asynq.Option{
		asynq.MaxRetry(5),
		asynq.Timeout(30 * time.Second),
	}
	opts = append(defaults, opts...)

	// Create and enqueue task into Redis queue
	task := asynq.NewTask(TaskRemoveAgentFromCampaignGroup, jsonPayload, opts...)

	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue remove agent from campaign group task: %w", err)
	}

	// Log task enqueue confirmation
	slog.Info("enqueued remove agent from campaign group task", "type", task.Type(), "queue", info.Queue, "user_id", payload.UserID)
	return nil
}

// ProcessTaskRemoveAgentFromCampaignGroup processes the background task to remove an agent from campaign groups upon revocation.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRemoveAgentFromCampaignGroup(ctx context.Context, task *asynq.Task) error {
	// Parse task payload into struct
	var payload RemoveAgentFromCampaignGroupPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal remove agent from campaign group payload: %w", err)
	}

	// Verify required campaign groups service is injected
	if redisTaskProcessor.campaignGroupsService == nil {
		return fmt.Errorf("campaign groups service is not configured in task processor")
	}

	// Remove revoked agent from all campaign groups for this party
	if err := redisTaskProcessor.campaignGroupsService.RemoveUserFromCampaignGroups(ctx, payload.PartyID, payload.UserID); err != nil {
		slog.Error("failed to remove agent from campaign groups", "user_id", payload.UserID, "party_id", payload.PartyID, "error", err)
		return fmt.Errorf("failed to remove agent from campaign groups: %w", err)
	}

	// Log successful agent removal
	// slog.Info("successfully removed agent from campaign groups", "user_id", payload.UserID, "party_id", payload.PartyID, "election_group_id", payload.ElectionGroupID)
	return nil
}

// DistributeTaskEnrollAgentInCampaignGroup enqueues a background job to provision/resolve the campaign group
// for an approved agent or supervisor, add them as a member, and sync party chapter officials.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskEnrollAgentInCampaignGroup(
	ctx context.Context,
	payload *EnrollAgentInCampaignGroupPayload,
	opts ...asynq.Option,
) error {
	// Serialize task payload to JSON bytes
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal enroll agent in campaign group payload: %w", err)
	}

	// Set default retry attempts (5 times) and task run timeout (30s)
	defaults := []asynq.Option{
		asynq.MaxRetry(5),
		asynq.Timeout(30 * time.Second),
	}
	// Append caller options so they can extend or override defaults
	opts = append(defaults, opts...)

	// Create a new Asynq task with the task name, payload, and options
	task := asynq.NewTask(TaskEnrollAgentInCampaignGroup, jsonPayload, opts...)

	// Enqueue the task into Redis via Asynq client
	_, err = redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue enroll agent in campaign group task: %w", err)
	}

	// Log confirmation that task was queued successfully
	// slog.Info("enqueued enroll agent in campaign group task", "type", task.Type(), "queue", info.Queue, "user_id", payload.UserID, "role", payload.Role)
	return nil
}

// ProcessTaskEnrollAgentInCampaignGroup processes the background task to enroll an agent/supervisor
// into their territorial campaign group and ensure chapter officials are populated.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskEnrollAgentInCampaignGroup(ctx context.Context, task *asynq.Task) error {
	// Parse task JSON payload into typed struct
	var payload EnrollAgentInCampaignGroupPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal enroll agent in campaign group payload: %w", err)
	}

	// Verify required service dependency is injected
	if redisTaskProcessor.campaignGroupsService == nil {
		return fmt.Errorf("campaign groups service is not configured in task processor")
	}

	// Provision/resolve group, enroll user, and populate corresponding chapter officials
	if _, err := redisTaskProcessor.campaignGroupsService.EnsureAgentCampaignInGroup(ctx, campaigngroupsservice.EnsureAgentCampaignInGroupInput{
		PartyID:         payload.PartyID,
		ElectionGroupID: payload.ElectionGroupID,
		UserID:          payload.UserID,
		Role:            payload.Role,
		StateID:         payload.StateID,
		LgaID:           payload.LgaID,
		WardID:          payload.WardID,
		PollingUnitID:   payload.PollingUnitID,
	}); err != nil {
		slog.Error("failed to enroll agent in campaign group", "user_id", payload.UserID, "role", payload.Role, "error", err)
		return fmt.Errorf("failed to enroll agent in campaign group: %w", err)
	}

	// Log successful processing completion
	// slog.Info("successfully enrolled agent in campaign group", "user_id", payload.UserID, "role", payload.Role, "party_id", payload.PartyID)
	return nil
}
