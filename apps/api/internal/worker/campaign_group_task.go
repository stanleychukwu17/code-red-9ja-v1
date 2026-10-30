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

// Task name constant
const TaskEnrollAgentInCampaignGroup = "task:enroll_agent_in_campaign_group"

// CampaignGroupsService defines the interface needed by the worker for campaign group operations.
type CampaignGroupsService interface {
	EnsureAgentCampaignInGroup(ctx context.Context, input campaigngroupsservice.EnsureAgentCampaignInGroupInput) (*queries.CampaignGroup, error)
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

// DistributeTaskEnrollAgentInCampaignGroup enqueues a background job to provision/resolve the campaign group
// for an approved agent or supervisor, add them as a member, and sync party chapter officials.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskEnrollAgentInCampaignGroup(
	ctx context.Context,
	payload *EnrollAgentInCampaignGroupPayload,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal enroll agent in campaign group payload: %w", err)
	}

	defaults := []asynq.Option{
		asynq.MaxRetry(5),
		asynq.Timeout(30 * time.Second),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskEnrollAgentInCampaignGroup, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue enroll agent in campaign group task: %w", err)
	}

	slog.Info("enqueued enroll agent in campaign group task", "type", task.Type(), "queue", info.Queue, "user_id", payload.UserID, "role", payload.Role)
	return nil
}

// ProcessTaskEnrollAgentInCampaignGroup processes the background task to enroll an agent/supervisor
// into their territorial campaign group and ensure chapter officials are populated.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskEnrollAgentInCampaignGroup(ctx context.Context, task *asynq.Task) error {
	var payload EnrollAgentInCampaignGroupPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal enroll agent in campaign group payload: %w", err)
	}

	if redisTaskProcessor.campaignGroupsService == nil {
		return fmt.Errorf("campaign groups service is not configured in task processor")
	}

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

	slog.Info("successfully enrolled agent in campaign group", "user_id", payload.UserID, "role", payload.Role, "party_id", payload.PartyID)
	return nil
}
