package middleware

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type contextKey string

const ClaimsKey contextKey = "claims"
const CampaignGroupKey contextKey = "campaign_group"

// CampaignGroupAccessChecker defines the service interface needed for campaign group authorization.
type CampaignGroupAccessChecker interface {
	GetCampaignGroupByID(ctx context.Context, id int64) (queries.CampaignGroup, error)
	CanUserAccessGroup(ctx context.Context, group queries.CampaignGroup, claims *utils.JWTClaims) (bool, error)
}

// GetClaims extracts JWT claims from the HTTP request context.
func GetClaims(r *http.Request) (*utils.JWTClaims, bool) {
	return GetClaimsFromContext(r.Context())
}

// GetClaimsFromContext extracts JWT claims from a context.
func GetClaimsFromContext(ctx context.Context) (*utils.JWTClaims, bool) {
	claims, ok := ctx.Value(ClaimsKey).(*utils.JWTClaims)
	return claims, ok && claims != nil
}

// GetCampaignGroupFromContext extracts the CampaignGroup from the request context if set by middleware.
func GetCampaignGroupFromContext(ctx context.Context) (queries.CampaignGroup, bool) {
	group, ok := ctx.Value(CampaignGroupKey).(queries.CampaignGroup)
	return group, ok
}

// AuthMiddleware extracts the JWT token from cookies or Authorization header,
// verifies it, and stores the claims in the request context.
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var tokenStr string

			// 1. Try to get token from Cookie
			cookie, err := r.Cookie("accessToken")
			if err == nil {
				tokenStr = cookie.Value
			}

			// 2. Try to get token from Authorization header if cookie not found or empty
			if tokenStr == "" {
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" {
					if after, found := strings.CutPrefix(authHeader, "Bearer "); found {
						tokenStr = after
					} else {
						tokenStr = authHeader
					}
				}
			}

			if tokenStr == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"success":false,"message":"Unauthorized: missing token"}`))
				return
			}

			// 3. Verify the token
			claims, err := utils.VerifyToken(tokenStr, jwtSecret)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"success":false,"message":"Unauthorized: expired token"}`))
				return
			}

			// 4. Set claims in context
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole checks if the user's roles contain any of the allowed roles list.
// Assumes AuthMiddleware has been run.
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(ClaimsKey).(*utils.JWTClaims)
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"success":false,"message":"Unauthorized: claims not found"}`))
				return
			}

			roleAllowed := false
			for _, role := range allowedRoles {
				if claims.HasRole(role) {
					roleAllowed = true
					break
				}
			}

			if !roleAllowed {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"success":false,"message":"Forbidden: insufficient permissions"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// OptionalAuthMiddleware extracts JWT claims from cookies or Authorization header if present and valid,
// and sets claims in the request context. If no token is provided or the token is invalid,
// it proceeds without setting claims instead of failing with 401.
func OptionalAuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var tokenStr string

			// 1. Try to get token from Cookie
			cookie, err := r.Cookie("accessToken")
			if err == nil {
				tokenStr = cookie.Value
			}

			// 2. Try to get token from Authorization header if cookie not found or empty
			if tokenStr == "" {
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" {
					if after, found := strings.CutPrefix(authHeader, "Bearer "); found {
						tokenStr = after
					} else {
						tokenStr = authHeader
					}
				}
			}

			if tokenStr != "" {
				if claims, err := utils.VerifyToken(tokenStr, jwtSecret); err == nil && claims != nil {
					ctx := context.WithValue(r.Context(), ClaimsKey, claims)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireCampaignGroupAccess validates that:
// 1. A valid campaign group ID is present in the route path ({id}).
// 2. The campaign group exists in the database.
// 3. The authenticated user (via JWT claims) is authorized:
//   - Global admin (admin, super_admin)
//   - Party admin for the group's party (party_admin, super_party_admin where claims.PartyID == group.PartyID)
//   - Enrolled member in campaign_group_members
//
// Upon success, stores the retrieved queries.CampaignGroup in context under CampaignGroupKey.
func RequireCampaignGroupAccess(service CampaignGroupAccessChecker, utilsInstance *utils.Utils) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Verify user is authenticated
			claims, ok := GetClaims(r)
			if !ok || claims == nil {
				utilsInstance.RespondError(w, http.StatusUnauthorized, "Unauthorized: missing or invalid authentication token")
				return
			}

			// 2. Extract and parse campaign group ID from route URL ({id})
			idParam := chi.URLParam(r, "id")
			groupID, err := strconv.ParseInt(idParam, 10, 64)
			if err != nil || groupID <= 0 {
				utilsInstance.RespondError(w, http.StatusBadRequest, "Invalid campaign group ID")
				return
			}

			// 3. Fetch campaign group metadata (uses Redis cache)
			group, err := service.GetCampaignGroupByID(r.Context(), groupID)
			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					utilsInstance.RespondError(w, http.StatusNotFound, "Campaign group not found")
					return
				}
				utilsInstance.RespondError(w, http.StatusInternalServerError, "Failed to resolve campaign group")
				return
			}

			// 4. Check access rights: global admin, party admin, or enrolled operative
			allowed, err := service.CanUserAccessGroup(r.Context(), group, claims)
			if err != nil {
				utilsInstance.RespondError(w, http.StatusInternalServerError, "Failed to verify campaign group access")
				return
			}

			if !allowed {
				utilsInstance.RespondError(w, http.StatusForbidden, "You do not have permission to access this campaign group")
				return
			}

			// 5. Inject verified group into request context for downstream handlers
			ctx := context.WithValue(r.Context(), CampaignGroupKey, group)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
