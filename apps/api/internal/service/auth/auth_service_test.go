package authservice_test

import (
	"testing"

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
