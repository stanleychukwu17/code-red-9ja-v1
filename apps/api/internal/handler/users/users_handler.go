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

	"free9ja/api/internal/service/audit"
	monnifyclient "free9ja/api/internal/service/monnify"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	GetUserRoles(ctx context.Context, userID int64) ([]queries.GetUserRolesRow, error)
	AssignUserRole(ctx context.Context, userID int64, code string, whoAssigned int64) error
	GetMoreInfoAboutThisUser(ctx context.Context, userID int64) (queries.UserMoreInfo, error)
	GetUserVerification(ctx context.Context, userID int64) (queries.UserVerification, error)
	UpdateUserProfile(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32) error
	ListUsers(ctx context.Context, arg queries.ListUsersParams) ([]queries.ListUsersRow, error)
	DeleteUser(ctx context.Context, id int64, fakeID int64) error
	AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32, stateOfOrigin int16, partyID int16, email string) error

	GetBanks(ctx context.Context) ([]monnifyclient.Bank, error)
	ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error)

	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
	GetUserWallet(ctx context.Context, userID int64) (queries.UserWallet, error)
	GetUserWalletTransactions(ctx context.Context, userID int64, limit, offset int32) ([]queries.UserWalletTransaction, error)
	WithdrawFromUserWallet(ctx context.Context, userID int64, amountKobo int64, transactionReference string, bankAccountNumber, bankCode, narration string) (queries.UserWalletTransaction, error)
	ProvisionMissingWallets(ctx context.Context) (int, int, error)

	GetUserPhoneNumbersByUserID(ctx context.Context, userID int64) ([]queries.UsersPhoneNumber, error)
	DeleteUserPhoneNumber(ctx context.Context, id int64) error
}

// BodiesService interface defines the methods needed from the bodies service
type BodiesService interface {
	CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error)
	CheckState(ctx context.Context, country_id, state_id int16) (queries.GetStateByIDRow, error)
	CheckCity(ctx context.Context, state_id int16, city_id int32) (queries.GetCityByIDRow, error)
}

// Handler holds dependencies for the users handler
type Handler struct {
	usersService  UsersService
	auditService  audit.AuditService
	bodiesService BodiesService
	validate      *validator.Validate
	utils         *utils.Utils
}

// NewHandler creates a new instance of the users handler
func NewHandler(usersService UsersService, auditService audit.AuditService, bodiesService BodiesService, utilsInstance *utils.Utils) *Handler {
	return &Handler{
		usersService:  usersService,
		auditService:  auditService,
		bodiesService: bodiesService,
		validate:      validator.New(),
		utils:        utilsInstance,
	}
}

// UserResponse represents the sanitized user profile details returned to the frontend
type UserResponse struct {
	ID                 int64    `json:"id"`
	FakeID             int64    `json:"fake_id"`
	Email              string   `json:"email"`
	Avatar             string   `json:"avatar"`
	Phone              string   `json:"phone"`
	Username           string   `json:"username"`
	LastName           string   `json:"last_name"`
	FirstName          string   `json:"first_name"`
	MiddleName         string   `json:"middle_name"`
	Gender             string   `json:"gender"`
	DateOfBirth        string   `json:"date_of_birth"`
	CurrentCountry     int16    `json:"current_country"`
	CurrentState       int16    `json:"current_state"`
	CurrentCity        int32    `json:"current_city"`
	CurrentLga         int32    `json:"current_lga"`
	CurrentWard        int32    `json:"current_ward"`
	StateOfOrigin      int16    `json:"state_of_origin"`
	NinVerified        bool     `json:"nin_verified"`
	PhoneVerified      bool     `json:"phone_verified"`
	EmailVerified      bool     `json:"email_verified"`
	VotersCardVerified bool     `json:"voters_card_verified"`
	Roles              []string `json:"roles"`
	AccountStatus      string   `json:"account_status"`
	PartyID            int64    `json:"party_id,omitempty"`
	PollingUnitID      int64    `json:"polling_unit_id,omitempty"`
	CreatedAt          string   `json:"created_at"`
	UpdatedAt          string   `json:"updated_at"`
	WhatsappPhone      string   `json:"whatsapp_phone"`
	DataPhone          string   `json:"data_phone"`
	EducationalStatus  string   `json:"educational_status"`
	HighestDegree      string   `json:"highest_degree"`
	GraduationYear     string   `json:"graduation_year"`
	SchoolName         string   `json:"school_name"`
	BankAccountNumber  string   `json:"bank_account_number"`
	BankCode           string   `json:"bank_code"`
	VotersCardImage    string   `json:"voters_card_image"`
	Address            string   `json:"address"`
	Religion           string   `json:"religion"`
	MaritalStatus      string   `json:"marital_status"`
	EducationLevel     string   `json:"education_level"`
	CountryName        string   `json:"country_name,omitempty"`
	StateName          string   `json:"state_name,omitempty"`
	CityName           string   `json:"city_name,omitempty"`
}

func mapUserToResponse(u queries.UserWithPlaces, p *queries.UserMoreInfo, v *queries.UserVerification, uRoles []queries.GetUserRolesRow) UserResponse {
	var email, avatar, phone, username, lastName, firstName, middleName, gender string
	var dateOfBirth, accountStatus string
	var ninVerified, phoneVerified, emailVerified, votersCardVerified bool
	var whatsappPhone, dataPhone, educationalStatus, highestDegree, graduationYear, schoolName string
	var bankAccountNumber, bankCode, votersCardImage, address string
	var religion, maritalStatus, educationLevel string
	var partyID, pollingUnitID int64
	var cityID, lgaID, wardID int32
	var stateOfOrigin int16
	var roles []string

	for _, r := range uRoles {
		roles = append(roles, r.Code)
	}

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
	if v != nil {
		if v.NinVerified.Valid {
			ninVerified = v.NinVerified.Bool
		}
		if v.PhoneVerified.Valid {
			phoneVerified = v.PhoneVerified.Bool
		}
		if v.EmailVerified.Valid {
			emailVerified = v.EmailVerified.Bool
		}
		if v.VotersCardVerified.Valid {
			votersCardVerified = v.VotersCardVerified.Bool
		}
	}
	if u.AccountStatus.Valid {
		accountStatus = u.AccountStatus.String
	}
	if u.PartyID.Valid {
		partyID = int64(u.PartyID.Int16)
	}
	if u.CurrentCity.Valid {
		cityID = u.CurrentCity.Int32
	}
	if u.StateOfOrigin.Valid {
		stateOfOrigin = u.StateOfOrigin.Int16
	}
	if u.PollingUnitID.Valid {
		pollingUnitID = int64(u.PollingUnitID.Int32)
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
	if p != nil {
		if p.EducationalStatus.Valid {
			educationalStatus = p.EducationalStatus.String
		}
		if p.HighestDegree.Valid {
			highestDegree = p.HighestDegree.String
		}
		if p.GraduationYear.Valid {
			graduationYear = p.GraduationYear.String
		}
		if p.SchoolName.Valid {
			schoolName = p.SchoolName.String
		}
		if p.Religion.Valid {
			religion = p.Religion.String
		}
		if p.MaritalStatus.Valid {
			maritalStatus = p.MaritalStatus.String
		}
		if p.EducationLevel.Valid {
			educationLevel = p.EducationLevel.String
		}
		if p.Address.Valid {
			address = p.Address.String
		}
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

	return UserResponse{
		ID:                 u.ID,
		FakeID:             u.FakeID.Int64,
		Email:              email,
		Avatar:             avatar,
		Phone:              phone,
		Username:           username,
		LastName:           lastName,
		FirstName:          firstName,
		MiddleName:         middleName,
		Gender:             gender,
		DateOfBirth:        dateOfBirth,
		CurrentCountry:     u.CurrentCountry,
		CurrentState:       u.CurrentState,
		CurrentCity:        cityID,
		CurrentLga:         lgaID,
		CurrentWard:        wardID,
		StateOfOrigin:      stateOfOrigin,
		NinVerified:        ninVerified,
		PhoneVerified:      phoneVerified,
		EmailVerified:      emailVerified,
		VotersCardVerified: votersCardVerified,
		Roles:              roles,
		AccountStatus:      accountStatus,
		PartyID:            partyID,
		PollingUnitID:      pollingUnitID,
		CreatedAt:          u.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:          u.UpdatedAt.Time.Format(time.RFC3339),
		WhatsappPhone:      whatsappPhone,
		DataPhone:          dataPhone,
		EducationalStatus:  educationalStatus,
		HighestDegree:      highestDegree,
		GraduationYear:     graduationYear,
		SchoolName:         schoolName,
		BankAccountNumber:  bankAccountNumber,
		BankCode:           bankCode,
		VotersCardImage:    votersCardImage,
		Address:            address,
		Religion:           religion,
		MaritalStatus:      maritalStatus,
		EducationLevel:     educationLevel,
	}
}

func mapListUserRowToResponse(u queries.ListUsersRow, uRoles []queries.GetUserRolesRow) UserResponse {
	var roles []string
	for _, r := range uRoles {
		roles = append(roles, r.Code)
	}

	return UserResponse{
		ID:             u.ID,
		FakeID:         u.FakeID.Int64,
		Email:          u.Email.String,
		Username:       u.Username.String,
		Avatar:         u.Avatar.String,
		FirstName:      u.FirstName.String,
		LastName:       u.LastName.String,
		MiddleName:     u.MiddleName.String,
		Gender:         u.Gender.String,
		DateOfBirth:    u.DateOfBirth.Time.Format("2006-01-02"),
		CurrentCountry: u.CurrentCountry,
		CurrentState:   u.CurrentState,
		CurrentCity:    u.CurrentCity.Int32,
		StateOfOrigin:  u.StateOfOrigin.Int16,
		Roles:          roles,
		AccountStatus:  u.AccountStatus.String,
		PartyID:        int64(u.PartyID.Int16),
		CreatedAt:      u.CreatedAt.Time.Format(time.RFC3339),
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

	uRoles, _ := h.usersService.GetUserRoles(r.Context(), user.ID)

	profile, _ := h.usersService.GetMoreInfoAboutThisUser(r.Context(), user.ID)

	verification, _ := h.usersService.GetUserVerification(r.Context(), user.ID)
	h.utils.RespondSuccess(w, http.StatusOK, "User profile retrieved successfully", map[string]interface{}{
		"user": mapUserToResponse(user, &profile, &verification, uRoles),
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
	Users []UserResponse `json:"users"`
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
	limit, cursor := parsePaginationParams(r)

	// split the roles into slice of string, inCase we are trying to get multiple roles at the same
	var roleSlice []string
	if role != "" {
		roleSlice = strings.Split(role, ",")
	}

	var partyID int64
	// 2. Retrieve JWT claims from the request context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)

	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
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
		LimitNum: int32(limit),
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

	// 6. Fetch paginated and filtered users from the database
	paginatedUsers, err := h.usersService.ListUsers(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch users: "+err.Error())
		return
	}

	hasMore := false
	nextCursor := ""

	if len(paginatedUsers) == limit && len(paginatedUsers) > 0 {
		hasMore = true
		nextCursor = strconv.FormatInt(paginatedUsers[len(paginatedUsers)-1].ID, 10)
	}

	responses := make([]UserResponse, len(paginatedUsers))
	for i, u := range paginatedUsers {
		uRoles, _ := h.usersService.GetUserRoles(r.Context(), u.ID)
		
		countryName := ""
		stateName := ""
		cityName := ""
		
		countryData, err := h.bodiesService.CheckCountry(r.Context(), u.CurrentCountry)
		if err == nil {
			countryName = countryData.Name
		}
		
		stateData, err := h.bodiesService.CheckState(r.Context(), u.CurrentCountry, u.CurrentState)
		if err == nil {
			stateName = stateData.Name
		}
		
		if u.CurrentCity.Int32 > 0 {
			cityData, err := h.bodiesService.CheckCity(r.Context(), u.CurrentState, u.CurrentCity.Int32)
			if err == nil {
				cityName = cityData.Name
			}
		}
		
		res := mapListUserRowToResponse(u, uRoles)
		res.CountryName = countryName
		res.StateName = stateName
		res.CityName = cityName
		
		responses[i] = res
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Users retrieved successfully", map[string]interface{}{
		"users": responses,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// DeleteUser handles DELETE /api/v1/admin/users/{id}
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	// Extract the user's JWT claims from the request context to identify the requester
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
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
	user, err := h.usersService.GetUserByFakeID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Permission checks: verify that the requester is an admin or a party admin
	isAdmin := claims.HasRole("admin")
	isPartyAdmin := claims.HasRole("party_admin")
	if !isAdmin && !isPartyAdmin {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	// Additional restrictions apply if the requester is a party admin but not a super admin
	if isPartyAdmin && !isAdmin {
		// Fetch the requester's own user details to determine their party affiliation
		currUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		// Party admin can only delete users belonging to their own party
		if !user.PartyID.Valid || !currUser.PartyID.Valid || user.PartyID.Int16 != currUser.PartyID.Int16 {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only delete members of your own party")
			return
		}

		// Party admin cannot delete administrative accounts (e.g. other admins)
		uRoles, _ := h.usersService.GetUserRoles(r.Context(), user.ID)
		isAdmin := false
		for _, ur := range uRoles {
			if strings.ToLower(ur.Code) == "admin" {
				isAdmin = true
				break
			}
		}
		if isAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you cannot delete administrative accounts")
			return
		}
	}

	// Proceed with soft-deleting the user from the database
	err = h.usersService.DeleteUser(r.Context(), user.ID, user.FakeID.Int64)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete user: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User deleted successfully", nil)
}

type AdminUpdateUserRequest struct {
	Avatar         string `json:"avatar" validate:"omitempty"`
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	StateOfOrigin  int16  `json:"state_of_origin"`
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
	Email          string `json:"email" validate:"required,email"`
}

// AdminUpdateUser handles PUT /api/v1/admin/users/{id}
func (h *Handler) AdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	// Extract the user's JWT claims from the request context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
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
	user, err := h.usersService.GetUserByFakeID(r.Context(), fakeID)
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

	// Permission checks:
	isAdmin := claims.HasAnyRole("super_admin", "admin")
	isPartyAdmin := claims.HasAnyRole("party_admin", "super_party_admin")
	if !isAdmin && !isPartyAdmin {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	// If the user is a party admin, add extra permissions check
	if isPartyAdmin && !isAdmin {
		// Get the requesting user's details
		currUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		// Party admin can only edit users belonging to their own party
		if !user.PartyID.Valid || !currUser.PartyID.Valid || user.PartyID.Int16 != currUser.PartyID.Int16 {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only edit members of your own party")
			return
		}

		// Party admin cannot change a user's party to another party
		if req.PartyID != int64(currUser.PartyID.Int16) {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only assign members to your own party")
			return
		}

		// Party admin cannot edit an admin user
		uRoles, _ := h.usersService.GetUserRoles(r.Context(), user.ID)
		isAdmin := false
		for _, ur := range uRoles {
			if strings.ToLower(ur.Code) == "admin" || strings.ToLower(ur.Code) == "super_admin" {
				isAdmin = true
				break
			}
		}
		if isAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you cannot edit administrative accounts")
			return
		}
	}

	// update the user
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
		int16(req.PartyID),
		req.Email,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update user: "+err.Error())
		return
	}

	// --- Audit Logging ---
	if h.auditService != nil {
		oldValuesJSON, _ := json.Marshal(user)

		// Fetch the new user state for accurate logging
		newUser, err := h.usersService.GetUserByFakeID(r.Context(), user.FakeID.Int64)
		var newValuesJSON []byte
		if err == nil {
			newValuesJSON, _ = json.Marshal(newUser)
		} else {
			// Fallback to request data if fetch fails
			newValuesJSON, _ = json.Marshal(req)
		}

		roleContext := "unknown"
		if len(claims.Roles) > 0 {
			roleContext = strings.Join(claims.Roles, ",")
		}

		_ = h.auditService.LogAction(r.Context(), queries.InsertAuditLogParams{
			ActorID:    claims.UserID,
			ActorRole:  audit.StringToText(roleContext),
			Action:     "UPDATE",
			EntityType: "USER",
			EntityID:   strconv.FormatInt(user.ID, 10),
			OldValues:  oldValuesJSON,
			NewValues:  newValuesJSON,
			IpAddress:  audit.ParseIP(r.RemoteAddr),
			UserAgent:  audit.StringToText(r.UserAgent()),
		})
	}
	// ---------------------

	h.utils.RespondSuccess(w, http.StatusOK, "User updated successfully", nil)
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
	idStr := chi.URLParam(r, "id")
	userFakeID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID format")
		return
	}

	// get the user details using the fake id
	user, err := h.usersService.GetUserByFakeID(r.Context(), userFakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// the user ID
	userID := user.ID

	// get the user phone numbers using the user id
	phones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), userID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve phone numbers: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Phone numbers retrieved successfully", map[string]interface{}{
		"phone_numbers": phones,
	})
}

type UpdateUserPhoneNumbersRequest struct {
	Phones []usersservice.PhonePayload `json:"phones"`
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
	idStr := chi.URLParam(r, "id")
	userFakeID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID format")
		return
	}

	var req UpdateUserPhoneNumbersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), userFakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	err = h.usersService.UpdateUserPhoneNumbers(r.Context(), user.ID, req.Phones)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update phone numbers: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Phone numbers updated successfully", nil)
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
// @Router       /admin/users/phones/{id} [delete]
func (h *Handler) DeleteUserPhoneNumber(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	phoneID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid phone number ID format")
		return
	}

	err = h.usersService.DeleteUserPhoneNumber(r.Context(), phoneID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete phone number: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Phone number deleted successfully", nil)
}
