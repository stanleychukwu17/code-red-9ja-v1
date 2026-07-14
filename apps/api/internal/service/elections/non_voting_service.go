package electionsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"time"
)

func (s *ElectionsService) GetNonVotingReasons(ctx context.Context) ([]queries.NonVotingReason, error) {
	return s.queries.GetNonVotingReasons(ctx)
}

func (s *ElectionsService) CreateDidNotVoteReason(ctx context.Context, arg queries.CreateDidNotVoteReasonParams) (queries.DidNotVoteReason, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.DidNotVoteReason{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Fetch election group to validate date
	eg, err := qtx.GetElectionGroupByID(ctx, arg.ElectionGroupID)
	if err != nil {
		return queries.DidNotVoteReason{}, fmt.Errorf("invalid election group: %w", err)
	}

	// Validate date: cannot submit reasons after election day
	now := time.Now().Truncate(24 * time.Hour)
	egDate := eg.ElectionDate.Time.Truncate(24 * time.Hour)
	if now.After(egDate) {
		return queries.DidNotVoteReason{}, fmt.Errorf("voting for this election has ended")
	}

	// Delete existing votes and reasons for this user and election group to allow scope changes and editing
	err = qtx.DeleteUserVotesByElectionGroup(ctx, queries.DeleteUserVotesByElectionGroupParams{
		UserID:          arg.UserID,
		ElectionGroupID: arg.ElectionGroupID,
	})
	if err != nil {
		return queries.DidNotVoteReason{}, fmt.Errorf("failed to delete existing votes: %w", err)
	}
	err = qtx.DeleteUserDidNotVoteReasonByElectionGroup(ctx, queries.DeleteUserDidNotVoteReasonByElectionGroupParams{
		UserID:          arg.UserID,
		ElectionGroupID: arg.ElectionGroupID,
	})
	if err != nil {
		return queries.DidNotVoteReason{}, fmt.Errorf("failed to delete existing non-voting reason: %w", err)
	}

	reason, err := qtx.CreateDidNotVoteReason(ctx, arg)
	if err != nil {
		return queries.DidNotVoteReason{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.DidNotVoteReason{}, err
	}

	return reason, nil
}
