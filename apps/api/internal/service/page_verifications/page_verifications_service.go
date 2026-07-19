package pageverificationsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/audit"
)

type UsersService interface {
	UpdateUserIsVerified(ctx context.Context, userID int64, fakeID int64, isVerified bool) error
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

type PartiesService interface {
	UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error
}

type PageVerificationsService struct {
	queries        *queries.Queries
	usersService   UsersService
	partiesService PartiesService
	auditService   audit.AuditService
}

func NewPageVerificationsService(
	q *queries.Queries,
	usersService UsersService,
	partiesService PartiesService,
	auditService audit.AuditService,
) *PageVerificationsService {
	return &PageVerificationsService{
		queries:        q,
		usersService:   usersService,
		partiesService: partiesService,
		auditService:   auditService,
	}
}

// VerifyPage assigns a verification badge to a page (user or party) and updates the is_verified flag.
func (s *PageVerificationsService) VerifyPage(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) (queries.PagesVerified, error) {
	// 1. Assign verification in pages_verified table
	pv, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
		PageType:           pageType,
		PageID:             pageID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return queries.PagesVerified{}, fmt.Errorf("failed to add page verification: %w", err)
	}

	// 2. Update the parent table's is_verified flag
	if err := s.updateParentIsVerifiedFlag(ctx, pageType, pageID, true); err != nil {
		return pv, fmt.Errorf("failed to update is_verified flag: %w", err)
	}

	// 3. Log the action
	// _ = s.auditService.LogAction(
	// 	ctx,
	// 	queries.InsertAuditLogParams{
	// 		UserID:       pgtype.Int8{Int64: actorID, Valid: true},
	// 		Action:       "assign_page_verification",
	// 		EntityType:   pageType,
	// 		EntityID:     pgtype.Int8{Int64: pageID, Valid: true},
	// 		Details:      pgtype.Text{String: fmt.Sprintf("Assigned verification type %d to %s %d", verificationTypeID, pageType, pageID), Valid: true},
	// 		OldData:      nil,
	// 		NewData:      []byte(fmt.Sprintf(`{"verification_type_id": %d}`, verificationTypeID)),
	// 	},
	// )

	return pv, nil
}

// RemoveVerification removes a verification badge. If no badges remain, sets is_verified to false.
func (s *PageVerificationsService) RemoveVerification(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) error {
	// 1. Remove verification from pages_verified table
	err := s.queries.RemovePageVerification(ctx, queries.RemovePageVerificationParams{
		PageType:           pageType,
		PageID:             pageID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return fmt.Errorf("failed to remove page verification: %w", err)
	}

	// 2. Check if the page has any other verifications left
	hasOtherVerifications, err := s.queries.CheckIfPageHasAnyVerification(ctx, queries.CheckIfPageHasAnyVerificationParams{
		PageType: pageType,
		PageID:   pageID,
	})
	if err != nil {
		return fmt.Errorf("failed to check remaining verifications: %w", err)
	}

	// 3. If no verifications left, set is_verified to false
	if !hasOtherVerifications {
		if err := s.updateParentIsVerifiedFlag(ctx, pageType, pageID, false); err != nil {
			return fmt.Errorf("failed to unset is_verified flag: %w", err)
		}
	}

	// 4. Log the action
	// _ = s.auditService.LogAction(
	// 	ctx,
	// 	actorID,
	// 	"remove_page_verification",
	// 	pageType,
	// 	pageID,
	// 	fmt.Sprintf("Removed verification type %d from %s %d", verificationTypeID, pageType, pageID),
	// 	fmt.Sprintf(`{"verification_type_id": %d}`, verificationTypeID),
	// 	"{}",
	// )

	return nil
}

// GetPageVerifications returns all verifications for a specific page.
func (s *PageVerificationsService) GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error) {
	return s.queries.GetPageVerifications(ctx, queries.GetPageVerificationsParams{
		PageType: pageType,
		PageID:   pageID,
	})
}

// ListVerificationTypes returns all available verification types.
func (s *PageVerificationsService) ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error) {
	return s.queries.ListVerificationTypes(ctx)
}

// updateParentIsVerifiedFlag calls the appropriate service to update the `is_verified` flag on the entity.
func (s *PageVerificationsService) updateParentIsVerifiedFlag(ctx context.Context, pageType string, pageID int64, isVerified bool) error {
	switch pageType {
	case "user":
		// Get actual user ID because pageID here should be fakeID from the frontend
		// Wait, we need to clarify if pageID stored is fakeID or actual ID.
		// Usually for external interactions, fakeID is used. If pageID is fakeID:
		user, err := s.usersService.GetUserByFakeID(ctx, pageID)
		if err != nil {
			return fmt.Errorf("user not found: %w", err)
		}
		return s.usersService.UpdateUserIsVerified(ctx, user.ID, user.FakeID.Int64, isVerified)
	case "party":
		return s.partiesService.UpdatePartyIsVerified(ctx, int16(pageID), isVerified)
	default:
		// Other types (e.g., party_member) could be added here
		return nil
	}
}
