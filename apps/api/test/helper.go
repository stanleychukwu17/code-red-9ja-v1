package test

import (
	"free9ja/api/internal/config"
	"testing"

	"github.com/joho/godotenv"
)

func BeforeEach(t *testing.T) error {
	godotenv.Load("../.env")
	config.Load()
	return nil
}
