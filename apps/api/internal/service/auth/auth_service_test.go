package authservice_test

import (
	"context"
	"testing"
	"time"

	authservice "free9ja/api/internal/service/auth"
)

func TestCleanUsername(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		wantErr  bool
	}{
		{"valid username", "JohnDoe", "johndoe", false},
		{"valid with dot", "john.doe", "john.doe", false},
		{"valid with underscore", "john_doe", "john_doe", false},
		{"valid alphanumeric", "j0hn123", "j0hn123", false},
		{"too short", "a", "", true},
		{"too long", "a123456789012345678901234567890", "", true},
		{"invalid start symbol", ".john", "", true},
		{"invalid end symbol", "john_", "", true},
		{"consecutive dots", "john..doe", "", true},
		{"consecutive underscores", "john__doe", "", true},
		{"mixed consecutive symbols", "john._doe", "", true},
		{"invalid characters", "john@doe", "", true},
		{"whitespace trim", "  johnDoe  ", "johndoe", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := authservice.CleanUsername(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("CleanUsername() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.expected {
				t.Errorf("CleanUsername() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestLogin_Validation(t *testing.T) {
	svc := authservice.NewAuthService(nil, nil, nil, nil, nil, nil, nil, "secret", 15*time.Minute, 7*24*time.Hour)

	// Test invalid identifier type
	_, err := svc.Login(context.Background(), "invalid", "user@example.com", "pass123", "")
	if err == nil || err.Error() != "invalid identifier type" {
		t.Errorf("expected 'invalid identifier type', got %v", err)
	}

	// Test phone without iso2
	_, err = svc.Login(context.Background(), "phone", "08012345678", "pass123", "")
	if err == nil || err.Error() != "iso2 is required" {
		t.Errorf("expected 'iso2 is required', got %v", err)
	}
}

func TestGenerateTempAvatarURL(t *testing.T) {
	tests := []struct {
		name      string
		firstName string
		lastName  string
		expected  string
	}{
		{
			name:      "both names present",
			firstName: "John",
			lastName:  "Doe",
			expected:  "https://ui-avatars.com/api/?name=John%2BDoe&background=random",
		},
		{
			name:      "with surrounding spaces",
			firstName: "  Jane ",
			lastName:  " Smith  ",
			expected:  "https://ui-avatars.com/api/?name=Jane%2BSmith&background=random",
		},
		{
			name:      "only first name",
			firstName: "Stanley",
			lastName:  "",
			expected:  "https://ui-avatars.com/api/?name=Stanley&background=random",
		},
		{
			name:      "only last name",
			firstName: "",
			lastName:  "Chukwu",
			expected:  "https://ui-avatars.com/api/?name=Chukwu&background=random",
		},
		{
			name:      "empty names fallback",
			firstName: "",
			lastName:  "",
			expected:  "https://ui-avatars.com/api/?name=User&background=random",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := authservice.GenerateTempAvatarURL(tt.firstName, tt.lastName)
			if got != tt.expected {
				t.Errorf("GenerateTempAvatarURL(%q, %q) = %q, want %q", tt.firstName, tt.lastName, got, tt.expected)
			}
		})
	}
}

