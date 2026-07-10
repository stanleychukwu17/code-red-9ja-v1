package usershandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	monnifyclient "free9ja/api/internal/service/monnify"
)

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByID(ctx context.Context, id int64) (queries.User, error)
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error)
	UpdateUserProfile(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32) error
	ListUsers(ctx context.Context) ([]queries.User, error)
	DeleteUser(ctx context.Context, id int64, fakeID int64) error
	AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32, stateOfOrigin int16, role, roleLevel string, partyID int64, email string) error

	GetBanks(ctx context.Context) ([]monnifyclient.Bank, error)
	ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error)

	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
	GetUserWallet(ctx context.Context, userID int64) (queries.UserWallet, error)
	GetUserWalletTransactions(ctx context.Context, userID int64, limit, offset int32) ([]queries.UserWalletTransaction, error)
	WithdrawFromUserWallet(ctx context.Context, userID int64, amountKobo int64, transactionReference string, bankAccountNumber, bankCode, narration string) (queries.UserWalletTransaction, error)
	ProvisionMissingWallets(ctx context.Context) (int, int, error)
}

// Handler holds dependencies for the users handler
type Handler struct {
	usersService UsersService
	validate     *validator.Validate
	utils        *utils.Utils
}

// NewHandler creates a new instance of the users handler
func NewHandler(usersService UsersService, utilsInstance *utils.Utils) *Handler {
	return &Handler{
		usersService: usersService,
		validate:     validator.New(),
		utils:        utilsInstance,
	}
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

// UserResponse represents the sanitized user profile details returned to the frontend
type UserResponse struct {
	ID                int64  `json:"id"`
	FakeID            int64  `json:"fake_id"`
	Email             string `json:"email"`
	Avatar            string `json:"avatar"`
	Phone             string `json:"phone"`
	Username          string `json:"username"`
	LastName          string `json:"last_name"`
	FirstName         string `json:"first_name"`
	MiddleName        string `json:"middle_name"`
	Gender            string `json:"gender"`
	DateOfBirth       string `json:"date_of_birth"`
	CurrentCountry    int16  `json:"current_country"`
	CurrentState      int16  `json:"current_state"`
	CurrentCity       int32  `json:"current_city"`
	CurrentLga        int32  `json:"current_lga"`
	CurrentWard       int32  `json:"current_ward"`
	StateOfOrigin     int16  `json:"state_of_origin"`
	NinVerified       string `json:"nin_verified"`
	PhoneVerified     string `json:"phone_verified"`
	Role              string `json:"role"`
	RoleLevel         string `json:"role_level"`
	AccountStatus     string `json:"account_status"`
	PartyID           int64  `json:"party_id,omitempty"`
	PollingUnitID     int64  `json:"polling_unit_id,omitempty"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
	WhatsappPhone     string `json:"whatsapp_phone"`
	DataPhone         string `json:"data_phone"`
	EducationalStatus string `json:"educational_status"`
	HighestDegree     string `json:"highest_degree"`
	GraduationYear    string `json:"graduation_year"`
	SchoolName        string `json:"school_name"`
	BankAccountNumber string `json:"bank_account_number"`
	BankCode          string `json:"bank_code"`
	VotersCardImage   string `json:"voters_card_image"`
	Address           string `json:"address"`
}

func mapUserToResponse(u queries.User) UserResponse {
	var email, avatar, phone, username, lastName, firstName, middleName, gender string
	var dateOfBirth, ninVerified, phoneVerified, role, roleLevel, accountStatus string
	var whatsappPhone, dataPhone, educationalStatus, highestDegree, graduationYear, schoolName string
	var bankAccountNumber, bankCode, votersCardImage, address string
	var partyID, pollingUnitID int64
	var cityID, lgaID, wardID int32
	var stateOfOrigin int16

	if u.Email.Valid {
		email = u.Email.String
	}
	if u.Avatar.Valid {
		avatar = u.Avatar.String
	}
	if u.Phone.Valid {
		phone = u.Phone.String
	}
	if u.Username.Valid {
		username = u.Username.String
	}
	if u.LastName.Valid {
		lastName = u.LastName.String
	}
	if u.FirstName.Valid {
		firstName = u.FirstName.String
	}
	if u.MiddleName.Valid {
		middleName = u.MiddleName.String
	}
	if u.Gender.Valid {
		gender = u.Gender.String
	}
	if u.DateOfBirth.Valid {
		dateOfBirth = u.DateOfBirth.Time.Format("2006-01-02")
	}
	if u.NinVerified.Valid {
		ninVerified = u.NinVerified.String
	}
	if u.PhoneVerified.Valid {
		phoneVerified = u.PhoneVerified.String
	}
	if u.Role.Valid {
		role = u.Role.String
	}
	if u.RoleLevel.Valid {
		roleLevel = u.RoleLevel.String
	}
	if u.AccountStatus.Valid {
		accountStatus = u.AccountStatus.String
	}
	if u.PartyID.Valid {
		partyID = u.PartyID.Int64
	}
	if u.CurrentCity.Valid {
		cityID = u.CurrentCity.Int32
	}
	if u.StateOfOrigin.Valid {
		stateOfOrigin = u.StateOfOrigin.Int16
	}
	if u.PollingUnitID.Valid {
		pollingUnitID = u.PollingUnitID.Int64
	}
	if u.CurrentLga.Valid {
		lgaID = u.CurrentLga.Int32
	}
	if u.CurrentWard.Valid {
		wardID = u.CurrentWard.Int32
	}
	if u.WhatsappPhone.Valid {
		whatsappPhone = u.WhatsappPhone.String
	}
	if u.DataPhone.Valid {
		dataPhone = u.DataPhone.String
	}
	if u.EducationalStatus.Valid {
		educationalStatus = u.EducationalStatus.String
	}
	if u.HighestDegree.Valid {
		highestDegree = u.HighestDegree.String
	}
	if u.GraduationYear.Valid {
		graduationYear = u.GraduationYear.String
	}
	if u.SchoolName.Valid {
		schoolName = u.SchoolName.String
	}
	if u.BankAccountNumber.Valid {
		bankAccountNumber = u.BankAccountNumber.String
	}
	if u.BankCode.Valid {
		bankCode = u.BankCode.String
	}
	if u.VotersCardImage.Valid {
		votersCardImage = u.VotersCardImage.String
	}
	if u.Address.Valid {
		address = u.Address.String
	}

	return UserResponse{
		ID:             u.ID,
		FakeID:         u.FakeID.Int64,
		Email:          email,
		Avatar:         avatar,
		Phone:          phone,
		Username:       username,
		LastName:       lastName,
		FirstName:      firstName,
		MiddleName:     middleName,
		Gender:         gender,
		DateOfBirth:    dateOfBirth,
		CurrentCountry: u.CurrentCountry,
		CurrentState:   u.CurrentState,
		CurrentCity:    cityID,
		CurrentLga:        lgaID,
		CurrentWard:       wardID,
		StateOfOrigin:     stateOfOrigin,
		NinVerified:       ninVerified,
		PhoneVerified:     phoneVerified,
		Role:              role,
		RoleLevel:         roleLevel,
		AccountStatus:     accountStatus,
		PartyID:           partyID,
		PollingUnitID:     pollingUnitID,
		CreatedAt:         u.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:         u.UpdatedAt.Time.Format(time.RFC3339),
		WhatsappPhone:     whatsappPhone,
		DataPhone:         dataPhone,
		EducationalStatus: educationalStatus,
		HighestDegree:     highestDegree,
		GraduationYear:    graduationYear,
		SchoolName:        schoolName,
		BankAccountNumber: bankAccountNumber,
		BankCode:          bankCode,
		VotersCardImage:   votersCardImage,
		Address:           address,
	}
}

// GetMe handles GET /api/v1/users/me
// @Summary      Get current user profile
// @Description  Fetches the profile details of the currently authenticated user
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200      {object}  UserResponse
// @Failure      401      {object}  map[string]interface{}
// @Failure      404      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users/me [get]
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User profile retrieved successfully", map[string]interface{}{
		"user": mapUserToResponse(user),
	})
}

// UpdateProfileRequest represents the request body parameters for updating the user profile
type UpdateProfileRequest struct {
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	Avatar         string `json:"avatar" validate:"omitempty"`
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
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
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

	err = h.usersService.UpdateUserProfile(
		r.Context(),
		user.ID,
		claims.FakeID,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Gender,
		req.Avatar,
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

func parsePaginationParams(r *http.Request) (int, int64) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 100 {
				limit = 100
			} else {
				limit = l
			}
		}
	}

	var cursor int64
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = c
		}
	}
	return limit, cursor
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type GetUsersResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Data    GetUsersData   `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetUsersData struct {
	Users []UserResponse `json:"users"`
}

// ListUsers handles GET /api/v1/users
// @Summary      List users
// @Description  Fetches the list of all registered users with role filtering and cursor-based pagination
// @Tags         Users
// @Produce      json
// @Param        role    query     string  false  "Role (admin, partymember, user)"
// @Param        limit   query     int     false  "Limit (default 20, max 100)"
// @Param        cursor  query     string  false  "Cursor (ID of last record)"
// @Success      200     {object}  GetUsersResponse
// @Failure      500     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	role := r.URL.Query().Get("role")
	partyIDStr := r.URL.Query().Get("party_id")
	limit, cursor := parsePaginationParams(r)

	var partyID int64
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if ok && claims != nil && claims.Role == "partymember" {
		currentUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch user details: "+err.Error())
			return
		}
		if currentUser.PartyID.Valid {
			partyID = currentUser.PartyID.Int64
		} else {
			// A party member user without a party assigned should see no users
			partyID = -1
		}
	} else if partyIDStr != "" {
		if pid, err := strconv.ParseInt(partyIDStr, 10, 64); err == nil {
			partyID = pid
		}
	}

	users, err := h.usersService.ListUsers(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch users: "+err.Error())
		return
	}

	var filteredUsers []queries.User
	for _, u := range users {
		if role != "" && (!u.Role.Valid || u.Role.String != role) {
			continue
		}
		if partyID == -1 {
			continue
		}
		if partyID > 0 && (!u.PartyID.Valid || u.PartyID.Int64 != partyID) {
			continue
		}
		filteredUsers = append(filteredUsers, u)
	}

	startIndex := 0
	if cursor > 0 {
		for i, u := range filteredUsers {
			if u.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginatedUsers []queries.User
	hasMore := false
	nextCursor := ""

	if startIndex < len(filteredUsers) {
		endIndex := startIndex + limit
		if endIndex >= len(filteredUsers) {
			endIndex = len(filteredUsers)
			paginatedUsers = filteredUsers[startIndex:endIndex]
		} else {
			paginatedUsers = filteredUsers[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginatedUsers[len(paginatedUsers)-1].ID, 10)
		}
	} else {
		paginatedUsers = []queries.User{}
	}

	responses := make([]UserResponse, len(paginatedUsers))
	for i, u := range paginatedUsers {
		responses[i] = mapUserToResponse(u)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Users retrieved successfully", map[string]interface{}{
		"users": responses,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

type AdminUpdateUserRequest struct {
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	Avatar         string `json:"avatar" validate:"omitempty"`
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
	StateOfOrigin  int16  `json:"state_of_origin"`
	Role           string `json:"role" validate:"required,oneof=user partymember admin"`
	RoleLevel      string `json:"role_level" validate:"required"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
	Email          string `json:"email" validate:"required,email"`
}

// DeleteUser handles DELETE /api/v1/admin/users/{id}
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.usersService.GetUserByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Permission checks:
	userRole := strings.ToLower(claims.Role)
	if userRole != "admin" && userRole != "partymember" {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	if userRole == "partymember" {
		currUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		if !currUser.RoleLevel.Valid || strings.ToLower(currUser.RoleLevel.String) != "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only party admins can delete members")
			return
		}

		// Party admin can only delete users belonging to their own party
		if !user.PartyID.Valid || !currUser.PartyID.Valid || user.PartyID.Int64 != currUser.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only delete members of your own party")
			return
		}

		// Party admin cannot delete administrative accounts
		if user.Role.Valid && strings.ToLower(user.Role.String) == "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you cannot delete administrative accounts")
			return
		}
	}

	err = h.usersService.DeleteUser(r.Context(), user.ID, user.FakeID.Int64)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete user: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User deleted successfully", nil)
}

// AdminUpdateUser handles PUT /api/v1/admin/users/{id}
func (h *Handler) AdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.usersService.GetUserByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	var req AdminUpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if req.Role == "partymember" && req.PartyID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: Key: 'AdminUpdateUserRequest.PartyID' Error:Field validation for 'PartyID' failed on the 'required' tag")
		return
	}

	// Permission checks:
	userRole := strings.ToLower(claims.Role)
	if userRole != "admin" && userRole != "partymember" {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	if userRole == "partymember" {
		currUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		if !currUser.RoleLevel.Valid || strings.ToLower(currUser.RoleLevel.String) != "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only party admins can edit members")
			return
		}

		// Party admin can only edit users belonging to their own party
		if !user.PartyID.Valid || !currUser.PartyID.Valid || user.PartyID.Int64 != currUser.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only edit members of your own party")
			return
		}

		// Party admin cannot change a user's party to another party
		if req.PartyID != currUser.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only assign members to your own party")
			return
		}

		// Party admin cannot change anyone's role to admin
		if strings.ToLower(req.Role) == "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you cannot grant administrative roles")
			return
		}

		// Party admin cannot edit an admin user
		if user.Role.Valid && strings.ToLower(user.Role.String) == "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you cannot edit administrative accounts")
			return
		}
	}

	err = h.usersService.AdminUpdateUser(
		r.Context(),
		user.ID,
		user.FakeID.Int64,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Gender,
		req.Avatar,
		req.CurrentCountry,
		req.CurrentState,
		req.CurrentCity,
		req.StateOfOrigin,
		req.Role,
		req.RoleLevel,
		req.PartyID,
		req.Email,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update user: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User updated successfully", nil)
}
