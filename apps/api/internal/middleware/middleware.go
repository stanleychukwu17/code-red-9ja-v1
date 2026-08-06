package middleware

import (
	"context"
	"net/http"
	"strings"

	"free9ja/api/internal/utils"
)

type contextKey string

const ClaimsKey contextKey = "claims"

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
					if strings.HasPrefix(authHeader, "Bearer ") {
						tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
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
