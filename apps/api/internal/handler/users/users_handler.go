package usershandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"free9ja/api/internal/db"

	"free9ja/api/internal/service/audit"
	authservice "free9ja/api/internal/service/auth"
	monnifyclient "free9ja/api/internal/service/monnify"
	permissionsservice "free9ja/api/internal/service/permissions"
	usersservice "free9ja/api/internal/service/users"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	GetUsersByFakeIDs(ctx context.Context, fakeIDs []int64) ([]queries.UserWithPlaces, error)
	GetUserRoles(ctx context.Context, userID int64) (queries.CachedUserRoles, error)
	AssignUserRole(ctx context.Context, userID int64, fakeID int64, code string, whoAssigned int64) error
	GetMoreInfoAboutThisUser(ctx context.Context, userID int64) (queries.UserMoreInfo, error)
	GetUserVerification(ctx context.Context, userID int64) (queries.UserVerification, error)
	UpdateUserProfile(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, avatarFileId *int64, countryID, stateID int16, cityID int32) error
	UpdateUserProfileDetails(ctx context.Context, userID int64, occupationID *int16, educationalStatus, highestDegree, graduationYear, schoolName, religion, maritalStatus, educationLevel, address string) error
	ListUsers(ctx context.Context, arg queries.ListUsersParams) ([]queries.ListUsersRow, error)
	DeleteUserAccount(ctx context.Context, id int64, fakeID int64) error
	AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, username, gender, avatar string, avatarFileId *int64, countryID, stateID int16, cityID int32, stateOfOrigin int16) error

	GetBanks(ctx context.Context) ([]monnifyclient.Bank, error)
	ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error)

	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
	GetUserWallet(ctx context.Context, userID int64) (queries.UserWallet, error)
	GetUserWalletTransactions(ctx context.Context, userID int64, limit, offset int32) ([]queries.UserWalletTransaction, error)
	WithdrawFromUserWallet(ctx context.Context, userID int64, amountKobo int64, transactionReference string, bankAccountNumber, bankCode, narration string) (queries.UserWalletTransaction, error)
	ProvisionMissingWallets(ctx context.Context) (int, int, error)

	GetUserPhoneNumbersByUserID(ctx context.Context, userID int64) ([]queries.UsersPhoneNumber, error)
	UpdateUserPhoneNumbers(ctx context.Context, userID int64, fakeID int64, phones []usersservice.PhonePayload) error
	DeleteUserPhoneNumber(ctx context.Context, id int64, userID int64) error
	GetUserPageVerifications(ctx context.Context, userID int64) ([]queries.GetPageVerificationsRow, error)
	MakeUserSuperAdmin(ctx context.Context, username string) error
	CheckUsername(ctx context.Context, username string) bool
	InvalidateUsernameCache(ctx context.Context, username string)
	UpdateUserRoles(ctx context.Context, userID int64, fakeID int64, roles []string, partyID *int64, whoAssigned int64) error
}

// BodiesService interface defines the methods needed from the bodies service
type BodiesService interface {
	CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error)
	CheckState(ctx context.Context, country_id, state_id int16) (queries.GetStateByIDRow, error)
	CheckCity(ctx context.Context, state_id int16, city_id int32) (queries.GetCityByIDRow, error)
	GetLocationNames(ctx context.Context, countryID, stateID int16, cityID int32) (string, string, string)
}

// PermissionsService interface defines the methods needed from the permissions service
type PermissionsService interface {
	CheckUserModificationPermission(claims *utils.JWTClaims, userDetails queries.UserWithPlaces) (bool, permissionsservice.UserModificationPermissions, error)
}

// PartiesService interface defines the methods needed from the parties service
type PartiesService interface {
	JoinParty(ctx context.Context, partyID int16, chapterID int32, userID, userFid int64) error
}

// Handler holds dependencies for the users handler
type Handler struct {
	usersService       UsersService
	auditService       audit.AuditService
	bodiesService      BodiesService
	permissionsService PermissionsService
	partiesService     PartiesService
	validate           *validator.Validate
	utils              *utils.Utils
}

// NewHandler creates a new instance of the users handler
func NewHandler(usersService UsersService, auditService audit.AuditService, bodiesService BodiesService, permissionsService PermissionsService, partiesService PartiesService, utilsInstance *utils.Utils) *Handler {
	return &Handler{
		usersService:       usersService,
		auditService:       auditService,
		bodiesService:      bodiesService,
		permissionsService: permissionsService,
		partiesService:     partiesService,
		validate:           validator.New(),
		utils:              utilsInstance,
	}
}

// UserProfileResponse represents the complete user profile details returned to the frontend
type UserProfileResponse struct {
	queries.UserWithPlaces
	Profile *queries.UserMoreInfo `json:"profile,omitempty"`
}

// GetBanks handles GET /api/v1/banks
// @Summary      Get list of banks
// @Description  Returns a list of real Nigerian banks from Monnify
// @Tags         Banks
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Banks fetched successfully"
// @Failure      500  {object} map[string]interface{} "Failed to fetch banks"
// @Router       /banks [get]
func (h *Handler) GetBanks(w http.ResponseWriter, r *http.Request) {
	banks, err := h.usersService.GetBanks(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch banks: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Banks fetched successfully", map[string]interface{}{
		"banks": banks,
	})
}

// ValidateBankAccount handles GET /api/v1/banks/validate
// @Summary      Validate bank account
// @Description  Validates account number and bank code via Monnify, returning the account name
// @Tags         Banks
// @Accept       json
// @Produce      json
// @Param        accountNumber query string true "Account Number"
// @Param        bankCode      query string true "Bank Code"
// @Success      200  {object} map[string]interface{} "Account validated successfully"
// @Failure      400  {object} map[string]interface{} "Missing parameters"
// @Failure      500  {object} map[string]interface{} "Validation failed"
// @Router       /banks/validate [get]
func (h *Handler) ValidateBankAccount(w http.ResponseWriter, r *http.Request) {
	accountNumber := r.URL.Query().Get("accountNumber")
	bankCode := r.URL.Query().Get("bankCode")

	if accountNumber == "" || bankCode == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "accountNumber and bankCode are required")
		return
	}

	accountName, err := h.usersService.ValidateBankAccount(r.Context(), accountNumber, bankCode)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to validate account: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Account validated successfully", map[string]interface{}{
		"accountName": accountName,
	})
}

// GetMe handles GET /api/v1/users/me
// @Summary      Get current user profile
// @Description  Fetches the profile details of the currently authenticated user
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      404      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users/me [get]
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	profile, _ := h.usersService.GetMoreInfoAboutThisUser(r.Context(), user.ID)

	h.utils.RespondSuccess(w, http.StatusOK, "User profile retrieved successfully", map[string]interface{}{
		"user": UserProfileResponse{
			UserWithPlaces: user,
			Profile:        &profile,
		},
	})
}

// UpdateProfileRequest represents the request body parameters for updating the user profile
type UpdateProfileRequest struct {
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	Avatar         string `json:"avatar" validate:"omitempty"`
	AvatarFileId   *int64 `json:"avatar_file_id" validate:"omitempty"`
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
}

// UpdateProfile handles PUT /api/v1/users/profile
// @Summary      Update user profile
// @Description  Updates the profile of the currently authenticated user
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        request  body      UpdateProfileRequest  true  "Profile update parameters"
// @Success      200      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      442      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users/profile [put]
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	if len(req.Avatar) == 0 && req.AvatarFileId == nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Avatar File ID is required")
		return
	}

	err = h.usersService.UpdateUserProfile(
		r.Context(),
		user.ID,
		claims.FakeID,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Gender,
		req.Avatar,
		req.AvatarFileId,
		req.CurrentCountry,
		req.CurrentState,
		req.CurrentCity,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update profile: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Profile updated successfully", nil)
}

// parsePaginationParams extracts and validates pagination parameters from the HTTP request query string.
// It returns a limit (number of items to return) and a cursor (the starting point for the next page).
func parsePaginationParams(r *http.Request) (int, int64) {
	limit := 20 // Set a default limit of 20 items per page

	// Check if a "limit" query parameter was provided in the URL
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		// Attempt to parse the limit string into an integer. Ensure it's a positive number.
		if limitNum, err := strconv.Atoi(limitStr); err == nil && limitNum > 0 {
			if limitNum > 100 {
				limit = 100
			} else {
				limit = limitNum
			}
		}
	}

	// Initialize the cursor variable, which defaults to 0 (indicating the first page or starting point)
	var cursor int64
	// Check if a "cursor" query parameter was provided in the URL
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		// Attempt to parse the cursor string into a 64-bit integer
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			// Use the parsed cursor value
			cursor = c
		}
	}

	// Return the final resolved limit and cursor values
	return limit, cursor
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type GetUsersResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetUsersData    `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetUsersData struct {
	Users []queries.UserWithPlaces `json:"users"`
}

// ListUsers handles GET /api/v1/users
// @Summary      List users
// @Description  Fetches the list of all registered users with role filtering and cursor-based pagination
// @Tags         Users
// @Produce      json
// @Param        role    query     string  false  "Role (admin, party_admin, user)"
// @Param        limit   query     int     false  "Limit (default 20, max 100)"
// @Param        cursor  query     string  false  "Cursor (ID of last record)"
// @Success      200     {object}  GetUsersResponse
// @Failure      500     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// 1. Parse URL query parameters for filtering and pagination
	role := r.URL.Query().Get("role")
	partyIDStr := r.URL.Query().Get("party_id")
	search := r.URL.Query().Get("search")
	accountStatus := r.URL.Query().Get("account_status")
	limit, cursor := parsePaginationParams(r)

	// split the roles into slice of string, inCase we are trying to get multiple roles at the same
	var roleSlice []string
	if role != "" {
		roleSlice = strings.Split(role, ",")
	}

	var accountStatusSlice []string
	if accountStatus != "" {
		accountStatusSlice = strings.Split(accountStatus, ",")
	} else {
		accountStatusSlice = []string{"just_registered", "placeholder", "active", "inactive"}
	}

	var partyID int64
	// 2. Retrieve JWT claims from the request context
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// 3. Verify that the user has at least one of the required administrative roles
	if !claims.HasAnyRole("super_admin", "admin", "party_admin", "super_party_admin") {
		h.utils.RespondError(w, http.StatusForbidden, "You do not have permission to view this resource")
		return
	}

	// 4. Determine Data Isolation (Party Admin vs Super Admin)
	if claims.HasAnyRole("party_admin", "super_party_admin") {
		// If the user is a party admin, restrict their view to their own party's users
		currentUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch user details: "+err.Error())
			return
		}
		if currentUser.PartyID.Valid {
			partyID = int64(currentUser.PartyID.Int16)
		} else {
			h.utils.RespondError(w, http.StatusForbidden, "You must be assigned to a party to view users")
			return
		}
	} else if partyIDStr != "" {
		// For super_admin/admin: allow filtering by a specific party if provided in the URL
		if pid, err := strconv.ParseInt(partyIDStr, 10, 64); err == nil {
			partyID = pid
		}
	}

	// 5. Build query parameters
	arg := queries.ListUsersParams{
		LimitNum:      int32(limit),
		AccountStatus: accountStatusSlice,
	}
	if cursor > 0 {
		arg.Cursor = pgtype.Int8{Int64: cursor, Valid: true}
	}
	if partyID > 0 {
		arg.PartyID = pgtype.Int2{Int16: int16(partyID), Valid: true}
	}
	if len(roleSlice) > 0 {
		arg.RoleCodes = roleSlice
	}
	if search != "" {
		arg.Search = pgtype.Text{String: search, Valid: true}
	}

	// 6. Fetch paginated and filtered users from the database
	paginatedUsers, err := h.usersService.ListUsers(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch users: "+err.Error())
		return
	}

	hasMore := false // are there more users than the limit?
	nextCursor := "" // cursor is the last user returned from this fetch

	if len(paginatedUsers) == limit && len(paginatedUsers) > 0 {
		hasMore = true
		nextCursor = strconv.FormatInt(paginatedUsers[len(paginatedUsers)-1].ID, 10)
	}

	// Collect fake_ids for bulk fetching
	fakeIDs := make([]int64, 0, len(paginatedUsers))
	for _, u := range paginatedUsers {
		if u.FakeID.Valid {
			fakeIDs = append(fakeIDs, u.FakeID.Int64)
		}
	}

	// Fetch users efficiently via MGET + concurrent DB queries
	fullUsers, err := h.usersService.GetUsersByFakeIDs(r.Context(), fakeIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch detailed user profiles: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Users retrieved successfully", map[string]interface{}{
		"users": fullUsers,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// DeleteUserAccount handles DELETE /api/v1/admin/users/{id}
func (h *Handler) DeleteUserAccount(w http.ResponseWriter, r *http.Request) {
	// Extract the user's JWT claims from the request context to identify the requester
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse the target user ID from the URL parameters
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Fetch the target user's details from the database using their public (fake) ID
	userDetails, err := h.usersService.GetUserByFakeID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Permission checks using PermissionsService
	allowed, perms, permErr := h.permissionsService.CheckUserModificationPermission(claims, userDetails)
	if !allowed {
		if permErr != nil {
			h.utils.RespondError(w, http.StatusForbidden, permErr.Error())
		} else {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		}
		return
	}

	// Proceed with soft-deleting the user from the database
	err = h.usersService.DeleteUserAccount(r.Context(), userDetails.ID, userDetails.FakeID.Int64)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete user: "+err.Error())
		return
	}

	// marshal the old user details to JSON for logging
	oldValuesJSON, _ := json.Marshal(userDetails)

	// Create a copy of the user and set account_status to 'deleted' to represent new values
	updatedUserDetails := userDetails
	updatedUserDetails.AccountStatus.String = "deleted"
	updatedUserDetails.AccountStatus.Valid = true
	newValuesJSON, _ := json.Marshal(updatedUserDetails)

	// Derive the module name and actor role dynamically based on the verified permissions
	moduleName, actorRole := perms.GetAuditActorInfo()

	// --- Audit Logging ---
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Action:     db.ActionDeleteUserAccount,
		Module:     audit.StringToText(moduleName),
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(userDetails.ID, 10),
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})
	// ---------------------

	h.utils.RespondSuccess(w, http.StatusOK, "User deleted successfully", nil)
}

// AdminGetUserMoreInfo handles GET /api/v1/admin/users/{id}/more-info
func (h *Handler) AdminGetUserMoreInfo(w http.ResponseWriter, r *http.Request) {
	// Parse the target user's fake ID from the URL parameters
	fakeIDStr := chi.URLParam(r, "id")
	fakeID, err := strconv.ParseInt(fakeIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid fake ID")
		return
	}

	// Extract and validate the JWT claims of the admin making the request
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Retrieve the target user's details from the database using their fake ID
	targetUserDetails, err := h.usersService.GetUserByFakeID(r.Context(), fakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Target user not found")
		return
	}

	// Verify that the requesting admin has sufficient permissions to view/modify this user
	hasPermission, _, permErr := h.permissionsService.CheckUserModificationPermission(claims, targetUserDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, permErr.Error())
		return
	}

	// Fetch the extended profile information (occupation, education, address, etc.) for the user
	moreInfo, err := h.usersService.GetMoreInfoAboutThisUser(r.Context(), targetUserDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve user's more info")
		return
	}

	// Return the extended profile information to the client
	h.utils.RespondSuccess(w, http.StatusOK, "More info retrieved successfully", map[string]interface{}{
		"more_info": moreInfo,
	})
}

// AdminUpdateUserRequest represents the request payload for updating user basic info
type AdminUpdateUserRequest struct {
	Avatar         string `json:"avatar" validate:"omitempty"`
	AvatarFileId   *int64 `json:"avatar_file_id" validate:"omitempty"`
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Username       string `json:"username" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	StateOfOrigin  int16  `json:"state_of_origin"`
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
}

// AdminUpdateUser handles PUT /api/v1/admin/users/{id}
func (h *Handler) AdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	// Extract the user's JWT claims from the request context
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse the target user ID from the URL parameters
	fakeIdStr := chi.URLParam(r, "id")
	fakeID, err := strconv.ParseInt(fakeIdStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Fetch the target user's current details from the database
	targetUserDetails, err := h.usersService.GetUserByFakeID(r.Context(), fakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Decode the JSON request body into the AdminUpdateUserRequest struct
	var req AdminUpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate the decoded request struct based on validation tags
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	usernameChanged := false
	var oldUsername string

	// Check if the username is being changed and if it already exists
	if req.Username != "" && req.Username != targetUserDetails.Username.String {
		cleanUsername, err := authservice.CleanUsername(req.Username)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}

		if h.usersService.CheckUsername(r.Context(), cleanUsername) {
			h.utils.RespondError(w, http.StatusBadRequest, "Username is already taken")
			return
		}

		req.Username = cleanUsername
		usernameChanged = true
		oldUsername = targetUserDetails.Username.String
	}

	// Permission checks using permissionsService
	hasPermission, perms, permErr := h.permissionsService.CheckUserModificationPermission(claims, targetUserDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, permErr.Error())
		return
	}

	// Ensure that if the target user already has a party, the party cannot be changed
	if targetUserDetails.PartyID.Valid && req.PartyID != int64(targetUserDetails.PartyID.Int16) {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: party cannot be changed")
		return
	}

	// update the user
	err = h.usersService.AdminUpdateUser(
		r.Context(),
		targetUserDetails.ID,
		targetUserDetails.FakeID.Int64,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Username,
		req.Gender,
		req.Avatar,
		req.AvatarFileId,
		req.CurrentCountry,
		req.CurrentState,
		req.CurrentCity,
		req.StateOfOrigin,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update user: "+err.Error())
		return
	}

	// invalidate the old username cache if it changed
	if usernameChanged && oldUsername != "" {
		h.usersService.InvalidateUsernameCache(r.Context(), oldUsername)
		h.usersService.CheckUsername(r.Context(), req.Username)
	}

	// if the partyID is fresh, send a request for the user to be a member of the partyID received
	if !targetUserDetails.PartyID.Valid && req.PartyID > 0 {
		err = h.partiesService.JoinParty(r.Context(), int16(req.PartyID), 0, targetUserDetails.ID, targetUserDetails.FakeID.Int64)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to join party: "+err.Error())
			return
		}
	}

	// Fetch the new user state for accurate logging
	updatedUserDetails, err := h.usersService.GetUserByFakeID(r.Context(), targetUserDetails.FakeID.Int64)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get user: "+err.Error())
		return
	}

	// marshal the old user details to JSON for logging
	oldValuesJSON, _ := json.Marshal(targetUserDetails)
	newValuesJSON, _ := json.Marshal(updatedUserDetails)

	// Derive the module name and actor role dynamically based on the verified permissions
	// This ensures the audit log accurately reflects the context of the modification
	moduleName, actorRole := perms.GetAuditActorInfo()

	// --- Audit Logging ---
	// Asynchronously insert the audit log to prevent blocking the API response
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Action:     db.ActionUpdateUser,
		Module:     audit.StringToText(moduleName),
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(targetUserDetails.ID, 10),
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})
	// ---------------------

	h.utils.RespondSuccess(w, http.StatusOK, "User updated successfully", map[string]interface{}{
		"updatedUserDetails": updatedUserDetails,
	})
}

// AdminUpdateUserMoreInfoRequest represents the request payload for updating user more info
type AdminUpdateUserMoreInfoRequest struct {
	OccupationID      *int16 `json:"occupation_id" validate:"omitempty"`
	EducationalStatus string `json:"educational_status" validate:"omitempty"`
	EducationLevel    string `json:"education_level" validate:"omitempty"`
	HighestDegree     string `json:"highest_degree" validate:"omitempty"`
	GraduationYear    string `json:"graduation_year" validate:"omitempty"`
	SchoolName        string `json:"school_name" validate:"omitempty"`
	Religion          string `json:"religion" validate:"omitempty"`
	MaritalStatus     string `json:"marital_status" validate:"omitempty"`
	Address           string `json:"address" validate:"omitempty"`
}

// AdminUpdateUserMoreInfo handles PUT /api/v1/admin/users/{id}/more-info
func (h *Handler) AdminUpdateUserMoreInfo(w http.ResponseWriter, r *http.Request) {
	// Extract the user's JWT claims from the request context
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse the target user ID from the URL parameters
	fakeIdStr := chi.URLParam(r, "id")
	fakeID, err := strconv.ParseInt(fakeIdStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Fetch the target user's current details from the database
	targetUserDetails, err := h.usersService.GetUserByFakeID(r.Context(), fakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Decode the JSON request body into the AdminUpdateUserMoreInfoRequest struct
	var req AdminUpdateUserMoreInfoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate the decoded request struct based on validation tags
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Permission checks using permissionsService
	hasPermission, perms, permErr := h.permissionsService.CheckUserModificationPermission(claims, targetUserDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, permErr.Error())
		return
	}

	// Capture old values for audit logging
	oldMoreInfo, _ := h.usersService.GetMoreInfoAboutThisUser(r.Context(), targetUserDetails.ID)
	oldValuesJSON, _ := json.Marshal(oldMoreInfo)

	// update the user more info
	err = h.usersService.UpdateUserProfileDetails(
		r.Context(),
		targetUserDetails.ID,
		req.OccupationID,
		req.EducationalStatus,
		req.HighestDegree,
		req.GraduationYear,
		req.SchoolName,
		req.Religion,
		req.MaritalStatus,
		req.EducationLevel,
		req.Address,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update user profile: "+err.Error())
		return
	}

	// Determine module name and actor role for audit logging
	moduleName, actorRole := perms.GetAuditActorInfo()

	// Fetch the updated more info to return back to the client
	updatedMoreInfo, err := h.usersService.GetMoreInfoAboutThisUser(r.Context(), targetUserDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve updated user profile: "+err.Error())
		return
	}

	newValuesJSON, _ := json.Marshal(updatedMoreInfo)

	// --- Audit Logging ---
	// Asynchronously insert the audit log to prevent blocking the API response
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Action:     db.ActionUpdateUserMoreInfo,
		Module:     audit.StringToText(moduleName),
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(targetUserDetails.ID, 10),
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})
	// ---------------------

	h.utils.RespondSuccess(w, http.StatusOK, "User profile updated successfully", map[string]interface{}{
		"more_info": updatedMoreInfo,
	})
}

// GetUserPhoneNumbers handles GET /api/v1/admin/users/{id}/phones
// @Summary      Get user phone numbers
// @Description  Fetches the list of phone numbers for a user
// @Tags         Users
// @Produce      json
// @Param        id   path      string  true  "User ID or Fake ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /admin/users/{id}/phones [get]
func (h *Handler) GetUserPhoneNumbers(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// get the id from the url
	idStr := chi.URLParam(r, "id")
	userFakeID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID format")
		return
	}

	// get the user details using the fake id
	userDetails, err := h.usersService.GetUserByFakeID(r.Context(), userFakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// the user ID
	userID := userDetails.ID

	// check permissions to edit a user account or view user's phone numbers
	hasPermission, perms, err := h.permissionsService.CheckUserModificationPermission(claims, userDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// get the user phone numbers using the user id
	phones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve phone numbers: "+err.Error())
		return
	}

	// audit log if viewer is not the account owner
	if !perms.IsOwnerOfAccount {
		moduleName, actorRole := perms.GetAuditActorInfo()
		h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
			Module:     audit.StringToText(moduleName),
			Action:     db.ActionViewUserPhoneNumbers,
			ActorID:    claims.UserID,
			ActorRole:  audit.StringToText(actorRole),
			EntityType: db.EntityTypeUser,
			EntityID:   fmt.Sprintf("%d", userDetails.ID),
		})
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Phone numbers retrieved successfully", map[string]interface{}{
		"phone_numbers": phones,
	})
}

type UpdateUserPhoneNumbersRequest struct {
	UserFid int64                       `json:"user_fid"`
	Phones  []usersservice.PhonePayload `json:"phones"`
}

// UpdateUserPhoneNumbers handles PUT /api/v1/admin/users/{id}/phones
// @Summary      Update user phone numbers
// @Description  Create or update phone numbers for a user
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "User Fake ID"
// @Param        body body      UpdateUserPhoneNumbersRequest true "Phones"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /admin/users/{id}/phones [put]
func (h *Handler) UpdateUserPhoneNumbers(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Extract and parse user ID from URL
	idStr := chi.URLParam(r, "id")
	userFakeID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID format")
		return
	}

	// Decode the request body payload
	var req UpdateUserPhoneNumbersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Fetch target user details
	userDetails, err := h.usersService.GetUserByFakeID(r.Context(), userFakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Verify requester has permission to modify this user
	hasPermission, perms, err := h.permissionsService.CheckUserModificationPermission(claims, userDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// fetch old phone numbers before update for audit logging
	oldPhones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get old phone numbers: "+err.Error())
		return
	}

	// Ensure exactly one phone number is marked as default
	if len(req.Phones) > 0 {
		// Fetch country details for phone validation
		if userDetails.CurrentCountry == 0 {
			h.utils.RespondError(w, http.StatusBadRequest, "User country is not set")
			return
		}
		country, err := h.bodiesService.CheckCountry(r.Context(), userDetails.CurrentCountry)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get country details")
			return
		}

		// validate phone numbers
		defaultCount := 0
		for i := range req.Phones {
			if req.Phones[i].IsDefault {
				defaultCount++
			}

			// clean and validate phone number
			formattedPhone, err := utils.ValidatePhoneForCountry(req.Phones[i].RawInput, country.Iso2)
			if err != nil {
				h.utils.RespondError(w, http.StatusBadRequest, fmt.Sprintf("Invalid phone number format for %s", req.Phones[i].RawInput))
				return
			}

			// update the phone number with the formatted phone number
			req.Phones[i].Phone = formattedPhone
			req.Phones[i].Phonecode = country.Phonecode
		}

		// ensure at least one phone number is marked as default
		if defaultCount == 0 {
			h.utils.RespondError(w, http.StatusBadRequest, "At least one phone number must be marked as default")
			return
		}
		if defaultCount > 1 {
			h.utils.RespondError(w, http.StatusBadRequest, "Only one phone number can be marked as default")
			return
		}

		// Update phone numbers in the database
		err = h.usersService.UpdateUserPhoneNumbers(r.Context(), userDetails.ID, userFakeID, req.Phones)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update phone numbers: "+err.Error())
			return
		}
	}

	// fetch updated phone numbers from the database
	updatedPhones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get updated phone numbers: "+err.Error())
		return
	}

	// Audit log the update
	oldValues, _ := json.Marshal(oldPhones)
	newValues, _ := json.Marshal(updatedPhones)
	moduleName, actorRole := perms.GetAuditActorInfo()

	// save the log
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(moduleName),
		Action:     db.ActionUpdateUserPhoneNumbers,
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeUser,
		EntityID:   fmt.Sprintf("%d", userDetails.ID),
		OldValues:  oldValues,
		NewValues:  newValues,
	})

	// return phone numbers for UI to update the cached version
	h.utils.RespondSuccess(w, http.StatusOK, "Phone numbers updated successfully", map[string]interface{}{
		"phones":   updatedPhones,
		"user_fid": userFakeID,
	})
}

type DeleteUserPhoneNumberRequest struct {
	PhoneID int64 `json:"phone_id" validate:"required"`
	UserFid int64 `json:"user_fid" validate:"required"`
}

// DeleteUserPhoneNumber handles DELETE /api/v1/admin/users/phones/{id}
// @Summary      Delete a user phone number
// @Description  Deletes a specific user phone number by its ID
// @Tags         Users
// @Produce      json
// @Param        id   path      string  true  "Phone Number ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /admin/users/phones [delete]
func (h *Handler) DeleteUserPhoneNumber(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	var req DeleteUserPhoneNumberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// fetch user details by fake id
	userDetails, err := h.usersService.GetUserByFakeID(r.Context(), req.UserFid)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// check permissions
	hasPermission, perms, err := h.permissionsService.CheckUserModificationPermission(claims, userDetails)
	if !hasPermission {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// get list of phone numbers
	phones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch user phone numbers: "+err.Error())
		return
	}

	// validate it's not the only number
	if len(phones) <= 1 {
		h.utils.RespondError(w, http.StatusBadRequest, "Cannot delete the only phone number associated with the account")
		return
	}

	// find the phone number and validate it's not active
	var targetPhone *queries.UsersPhoneNumber
	for i := range phones {
		if phones[i].ID == req.PhoneID {
			targetPhone = &phones[i]
			break
		}
	}

	// if the phone number is not found, return an error
	if targetPhone == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Phone number not found")
		return
	}

	// if the phone number is active, return an error
	if targetPhone.IsDefault.Bool {
		h.utils.RespondError(w, http.StatusBadRequest, "Cannot delete an active phone number")
		return
	}

	// delete the phone number
	err = h.usersService.DeleteUserPhoneNumber(r.Context(), req.PhoneID, userDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete phone number: "+err.Error())
		return
	}

	// fetch updated phone numbers from the database
	updatedPhones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userDetails.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get updated phone numbers: "+err.Error())
		return
	}

	// log the activity that the phone number was deleted
	moduleName, actorRole := perms.GetAuditActorInfo()
	oldValues, _ := json.Marshal(targetPhone)
	newValues, _ := json.Marshal(updatedPhones)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(moduleName),
		Action:     db.ActionDeleteUserPhoneNumber,
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeUser,
		EntityID:   fmt.Sprintf("%d", userDetails.ID),
		OldValues:  oldValues,
		NewValues:  newValues,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Phone number deleted successfully", map[string]interface{}{
		"phones":   updatedPhones,
		"user_fid": req.UserFid,
	})
}

// MakeUserSuperAdminRequest represents the request to promote a user
type MakeUserSuperAdminRequest struct {
	Name string `json:"name" validate:"required,min=3"`
}

// @Summary Make a user superadmin
// @Description Promotes a user to superadmin if their username is in the pre-approved list
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body MakeUserSuperAdminRequest true "Superadmin promotion details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/superadmin [post]
func (h *Handler) MakeUserSuperAdmin(w http.ResponseWriter, r *http.Request) {
	var req MakeUserSuperAdminRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.(validator.ValidationErrors)[0].Translate(nil))
		return
	}

	err := h.usersService.MakeUserSuperAdmin(r.Context(), req.Name)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to make superadmin: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User successfully promoted to superadmin", nil)
}

// UpdateUserRolesRequest represents the request to completely replace a user's roles
type UpdateUserRolesRequest struct {
	UserFakeID *int64   `json:"user_fid" validate:"omitempty"`
	Roles      []string `json:"roles" validate:"required"`
	PartyID    *int64   `json:"party_id" validate:"omitempty"`
}

// @Summary Update all roles for a user
// @Description Replaces all roles for an existing user and optionally sets their party ID if party_admin is included
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body UpdateUserRolesRequest true "Role update details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/roles/update [post]
func (h *Handler) UpdateUserRoles(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
		return
	}

	isAdmin := claims.HasAnyRole("admin", "super_admin")
	isPartyAdmin := claims.HasAnyRole("party_admin", "super_party_admin")

	// Must be an admin or super_admin to update roles manually
	if !isAdmin && !isPartyAdmin {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions to manage roles")
		return
	}

	// the logic below is not fit enough to allow party admins to create other party admins,
	if isPartyAdmin {
		h.utils.RespondError(w, http.StatusForbidden, "Currently, party admins cannot assign roles")
		return
	}

	// de-structures the request body
	var req UpdateUserRolesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// validates the struct
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.(validator.ValidationErrors)[0].Translate(nil))
		return
	}

	// ensure user_fid is provided
	if req.UserFakeID == nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: user_fid is required")
		return
	}

	// get user details from the fake id
	userDetails, err := h.usersService.GetUserByFakeID(r.Context(), *req.UserFakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// get the userID
	userID := userDetails.ID

	// Make sure if they include party_admin they provide a party ID
	hasPartyAdmin := false
	for _, role := range req.Roles {
		if role == "party_admin" || role == "super_party_admin" {
			hasPartyAdmin = true
			break
		}
	}

	// if a party admin is to be assigned, the user must be a member of the PartyID provided
	if hasPartyAdmin {
		// party_id is required when assigning party_admin role
		if req.PartyID == nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: party_id is required when assigning party_admin role")
			return
		}

		// user must belong to the specified party to be assigned a party admin role
		if !userDetails.PartyID.Valid || int64(userDetails.PartyID.Int16) != *req.PartyID {
			h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: user must belong to the specified party to be assigned a party admin role")
			return
		}
	}

	//--start-- Check if they are trying to delete the super_admin role
	// check if there is a superAdmin in the user current roles
	hasSuperAdminCurrent := false
	for _, roleCode := range userDetails.Roles.RolesCode {
		if roleCode == "super_admin" {
			hasSuperAdminCurrent = true
			break
		}
	}

	// check if there is a superAdmin in the user new roles
	hasSuperAdminNew := false
	for _, roleCode := range req.Roles {
		if roleCode == "super_admin" {
			hasSuperAdminNew = true
			break
		}
	}

	// if this is not true, then there is an attempt to remove the super_admin role, and only a super_admin can do this
	if hasSuperAdminCurrent && !hasSuperAdminNew {
		// They are trying to delete super_admin
		if !claims.HasRole("super_admin") {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only a super_admin can remove the super_admin role")
			return
		}
	}
	//--end-- Check if they are trying to delete the super_admin role

	//--start-- Check if they are trying to delete the super_party_admin role
	hasSuperPartyAdminCurrent := false
	for _, roleCode := range userDetails.Roles.RolesCode {
		if roleCode == "super_party_admin" {
			hasSuperPartyAdminCurrent = true
			break
		}
	}

	// check if there is a superPartyAdmin in the user new roles
	hasSuperPartyAdminNew := false
	for _, roleCode := range req.Roles {
		if roleCode == "super_party_admin" {
			hasSuperPartyAdminNew = true
			break
		}
	}

	// if this is not true, then there is an attempt to remove the super_party_admin role
	if hasSuperPartyAdminCurrent && !hasSuperPartyAdminNew {
		// Only admin, super_admin, or super_party_admin can delete super_party_admin
		if !claims.HasAnyRole("admin", "super_admin", "super_party_admin") {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions to remove the super_party_admin role")
			return
		}
	}
	//--end-- Check if they are trying to delete the super_party_admin role

	// Call UpdateUserRoles
	err = h.usersService.UpdateUserRoles(r.Context(), userID, *req.UserFakeID, req.Roles, req.PartyID, claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update roles: "+err.Error())
		return
	}

	// get new userDetails
	freshUserDetails, err := h.usersService.GetUserByFakeID(r.Context(), *req.UserFakeID)

	// Log the action asynchronously
	oldValuesData, _ := json.Marshal(userDetails.Roles.RolesCode)
	newValuesData, _ := json.Marshal(freshUserDetails.Roles.RolesCode)

	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     pgtype.Text{String: db.ModuleAdmin, Valid: true},
		ActorID:    claims.UserID,
		ActorRole:  pgtype.Text{String: db.ActorRoleAdmin, Valid: true},
		Action:     db.ActionUpdateUserRoles,
		EntityType: db.EntityTypeUser,
		EntityID:   fmt.Sprintf("%d", userID),
		OldValues:  oldValuesData,
		NewValues:  newValuesData,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "User roles successfully updated", map[string]interface{}{
		"userDetails": freshUserDetails,
	})
}
