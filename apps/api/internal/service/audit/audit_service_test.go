package audit

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatID(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected string
	}{
		{
			name:     "int",
			input:    int(42),
			expected: "42",
		},
		{
			name:     "int16",
			input:    int16(123),
			expected: "123",
		},
		{
			name:     "int32",
			input:    int32(45678),
			expected: "45678",
		},
		{
			name:     "int64",
			input:    int64(9876543210),
			expected: "9876543210",
		},
		{
			name:     "uint64",
			input:    uint64(100),
			expected: "100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var result string
			switch v := tt.input.(type) {
			case int:
				result = FormatID(v)
			case int16:
				result = FormatID(v)
			case int32:
				result = FormatID(v)
			case int64:
				result = FormatID(v)
			case uint64:
				result = FormatID(v)
			}
			assert.Equal(t, tt.expected, result)
		})
	}
}
