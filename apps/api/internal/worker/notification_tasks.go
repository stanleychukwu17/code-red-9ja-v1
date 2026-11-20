package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	notificationsservice "free9ja/api/internal/service/notifications"

	"github.com/hibiken/asynq"
)

// Task name constants for notifications
const (
	TaskSendNotification      = "task:send_notification"
	TaskSendPartyNotification = "task:send_party_notification"
)

// NotificationsService defines the interface needed by the task processor for notification delivery.
type NotificationsService interface {
	CreateNotification(ctx context.Context, params notificationsservice.CreateNotificationInput) (*notificationsservice.NotificationItemResponse, error)
	CreatePartyNotification(ctx context.Context, params notificationsservice.CreatePartyNotificationInput) (*notificationsservice.PartyNotificationItemResponse, error)
}

// DistributeTaskSendNotification enqueues a background job to persist and broadcast a user notification.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskSendNotification(
	ctx context.Context,
	payload *notificationsservice.CreateNotificationInput,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal send notification payload: %w", err)
	}

	defaults := []asynq.Option{
		asynq.MaxRetry(3),
		asynq.Timeout(20 * time.Second),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskSendNotification, jsonPayload, opts...)

	_, err = redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue send notification task: %w", err)
	}

	return nil
}

// DistributeTaskSendPartyNotification enqueues a background job to persist and broadcast a party notification.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskSendPartyNotification(
	ctx context.Context,
	payload *notificationsservice.CreatePartyNotificationInput,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal send party notification payload: %w", err)
	}

	defaults := []asynq.Option{
		asynq.MaxRetry(3),
		asynq.Timeout(20 * time.Second),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskSendPartyNotification, jsonPayload, opts...)

	_, err = redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue send party notification task: %w", err)
	}

	return nil
}

// ProcessTaskSendNotification processes the background task to deliver a user notification.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskSendNotification(ctx context.Context, task *asynq.Task) error {
	var payload notificationsservice.CreateNotificationInput
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal send notification payload: %w", err)
	}

	if _, err := redisTaskProcessor.notificationsService.CreateNotification(ctx, payload); err != nil {
		slog.Error("failed to process send notification task", "error", err, "user_id", payload.RecipientUserID)
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// ProcessTaskSendPartyNotification processes the background task to deliver a party notification.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskSendPartyNotification(ctx context.Context, task *asynq.Task) error {
	var payload notificationsservice.CreatePartyNotificationInput
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal send party notification payload: %w", err)
	}

	if _, err := redisTaskProcessor.notificationsService.CreatePartyNotification(ctx, payload); err != nil {
		slog.Error("failed to process send party notification task", "error", err, "party_id", payload.PartyID)
		return fmt.Errorf("failed to create party notification: %w", err)
	}

	return nil
}
