package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the custom claims payload for JWTs
type JWTClaims struct {
	UserID    int64  `json:"user_id"`
	FakeID    int64  `json:"fake_id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	RoleLevel string `json:"role_level,omitempty"`
	PartyID   int64  `json:"party_id,omitempty"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT with the given claims, secret, and duration.
// roleLevel is optional; pass an empty string if not applicable.
func GenerateToken(userID int64, fakeID int64, username string, role string, roleLevel string, secret string, duration time.Duration, partyID ...int64) (string, error) {
	var pid int64
	if len(partyID) > 0 {
		pid = partyID[0]
	}
	claims := JWTClaims{
		UserID:    userID,
		FakeID:    fakeID,
		Username:  username,
		Role:      role,
		RoleLevel: roleLevel,
		PartyID:   pid,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// VerifyToken validates the signature of a token and extracts the claims
func VerifyToken(tokenStr string, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

type RandomStringResult struct {
	RandomString string
	HashedToken  string
}

// GenerateRandomString generates a random string of the given length
func GenerateRandomString() (RandomStringResult, error) {
	b := make([]byte, 32)

	_, err := rand.Read(b)
	if err != nil {
		return RandomStringResult{}, err
	}

	randString := base64.RawURLEncoding.EncodeToString(b)
	hashedToken := HashToken(randString)

	return RandomStringResult{
		RandomString: randString,
		HashedToken:  hashedToken,
	}, nil
}

func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
