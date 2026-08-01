package permissionsservice

import (
	"errors"
	"slices"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
)

type UserModificationPermissions struct {
	IsSuperAdmin           bool
	IsNormalAdmin          bool
	IsBothAdmin            bool
	IsOwnerOfAccount       bool
	OwnerIsVerified        bool
	IsPartyAdminWithRights bool
}

type PermissionsService struct {
}

func NewPermissionsService() *PermissionsService {
	return &PermissionsService{}
}

// CheckUserModificationPermission verifies if the requester (identified by claims) has the necessary
// permissions to modify the specified user's details. It enforces the following rules:
//   - Verified accounts can only be modified by the account owner or a super admin.
//   - Unverified/other accounts can be modified by the account owner, an admin, or a party admin
//     (provided they belong to the same party and the target account status is "placeholder").
//
// If permissions are insufficient, it returns false and an error with the reason.
func (s *PermissionsService) CheckUserModificationPermission(claims *utils.JWTClaims, userDetails queries.UserWithPlaces) (bool, UserModificationPermissions, error) {
	perms := UserModificationPermissions{
		IsSuperAdmin:           claims.HasRole("super_admin"),
		IsNormalAdmin:          claims.HasRole("admin"),
		IsBothAdmin:            claims.HasAnyRole("admin", "super_admin"),
		IsOwnerOfAccount:       claims.UserID == userDetails.ID,
		OwnerIsVerified:        userDetails.IsVerified.Bool && len(userDetails.Verifications) > 0,
		IsPartyAdminWithRights: claims.HasAnyRole("party_admin", "super_party_admin") && userDetails.PartyID.Int16 == claims.PartyID && userDetails.AccountStatus.String == "placeholder",
	}

	// if admin is not a super admin, they cannot edit super admin account
	if perms.IsNormalAdmin && !perms.IsSuperAdmin && slices.Contains(userDetails.Roles.RolesCode, "super_admin") {
		return false, perms, errors.New("Forbidden: admin cannot edit super admin account")
	}

	// if the user is verified, and the viewer is not the owner, then they should be a super admin
	if perms.OwnerIsVerified && !perms.IsOwnerOfAccount && !perms.IsSuperAdmin {
		return false, perms, errors.New("Forbidden: verified account: insufficient permissions")
	}

	// if the viewer is not the owner, then they should be an admin
	// if viewer is not an admin, they must be a party admin and they must be in the same party as the user
	// and the user account status be "placeholder"
	if !perms.IsOwnerOfAccount && !perms.IsBothAdmin && !perms.IsPartyAdminWithRights {
		return false, perms, errors.New("Forbidden: not owner of account: insufficient permissions")
	}

	return true, perms, nil
}
