package referrals

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"free9ja/api/internal/db/queries"
)

type ReferralsService struct {
	q queries.Querier
}

func NewReferralsService(q queries.Querier) *ReferralsService {
	return &ReferralsService{q: q}
}

func (s *ReferralsService) CreateReferral(ctx context.Context, params queries.CreateReferralParams) (queries.Referral, error) {
	return s.q.CreateReferral(ctx, params)
}

func (s *ReferralsService) GetReferral(ctx context.Context, id int64) (queries.Referral, error) {
	return s.q.GetReferral(ctx, id)
}

func (s *ReferralsService) GetReferralByReferredUserID(ctx context.Context, referredUserID int64) (queries.Referral, error) {
	return s.q.GetReferralByReferredUserID(ctx, referredUserID)
}

func (s *ReferralsService) ListReferrals(ctx context.Context, limit, offset int32) ([]queries.Referral, error) {
	return s.q.ListReferrals(ctx, queries.ListReferralsParams{
		Limit:  limit,
		Offset: offset,
	})
}

func (s *ReferralsService) ListReferralsByReferrer(ctx context.Context, referrerID int64, limit, offset int32) ([]queries.Referral, error) {
	return s.q.ListReferralsByReferrer(ctx, queries.ListReferralsByReferrerParams{
		ReferrerUserID: referrerID,
		Limit:          limit,
		Offset:         offset,
	})
}

func (s *ReferralsService) UpdateReferral(ctx context.Context, params queries.UpdateReferralParams) (queries.Referral, error) {
	// First check if it exists
	_, err := s.q.GetReferral(ctx, params.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.Referral{}, errors.New("referral not found")
		}
		return queries.Referral{}, err
	}
	
	return s.q.UpdateReferral(ctx, params)
}
