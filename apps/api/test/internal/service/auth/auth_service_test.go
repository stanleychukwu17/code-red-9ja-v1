package authservice_test

import (
	"strconv"
	"strings"
	"testing"

	authservice "free9ja/api/internal/service/auth"
)

func TestCleanUsername(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid username",
			input:   "john_doe",
			want:    "john_doe",
			wantErr: false,
		},
		{
			name:    "valid username with dots",
			input:   "john.doe.123",
			want:    "john.doe.123",
			wantErr: false,
		},
		{
			name:    "valid uppercase input",
			input:   "John_Doe",
			want:    "john_doe",
			wantErr: false,
		},
		{
			name:    "input with whitespace",
			input:   "  john_doe  ",
			want:    "john_doe",
			wantErr: false,
		},
		{
			name:    "too short",
			input:   "a",
			wantErr: true,
			errMsg:  "username must be between 2 and 30 characters",
		},
		{
			name:    "too long",
			input:   strings.Repeat("a", 31),
			wantErr: true,
			errMsg:  "username must be between 2 and 30 characters",
		},
		{
			name:    "invalid start character",
			input:   ".john",
			wantErr: true,
			errMsg:  "username can only contain letters, numbers, dots, and underscores",
		},
		{
			name:    "invalid end character",
			input:   "john_",
			wantErr: true,
			errMsg:  "username can only contain letters, numbers, dots, and underscores",
		},
		{
			name:    "consecutive dots",
			input:   "john..doe",
			wantErr: true,
			errMsg:  "username cannot contain consecutive dots or underscores",
		},
		{
			name:    "consecutive underscores",
			input:   "john__doe",
			wantErr: true,
			errMsg:  "username cannot contain consecutive dots or underscores",
		},
		{
			name:    "mixed consecutive symbols",
			input:   "john._doe",
			wantErr: true,
			errMsg:  "username cannot contain consecutive dots or underscores",
		},
		{
			name:    "special characters",
			input:   "john@doe",
			wantErr: true,
			errMsg:  "username can only contain letters, numbers, dots, and underscores",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := authservice.CleanUsername(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("CleanUsername() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				if err.Error() != tt.errMsg {
					t.Errorf("CleanUsername() error message = %v, want %v", err.Error(), tt.errMsg)
				}
				return
			}
			if got != tt.want {
				t.Errorf("CleanUsername() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGenerateFakeID(t *testing.T) {
	id := int64(12345)

	// Run multiple times to check range/format since it's random
	for i := 0; i < 100; i++ {
		fakeID := authservice.GenerateFakeID(id)
		s := strconv.FormatInt(fakeID, 10)

		// The fake ID should not be equal to the original ID
		if fakeID == id {
			t.Errorf("GenerateFakeID(%d) = %d; should not be equal to original ID", id, fakeID)
		}

		// It should be at least as long as the ID
		if len(s) < 5 {
			t.Errorf("GenerateFakeID(%d) = %d; too short", id, fakeID)
		}
	}
}
