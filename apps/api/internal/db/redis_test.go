package db_test

import (
	"context"
	"testing"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db"
	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewRedisClient(t *testing.T) {
	ctx := context.Background()

	// 1. Setup Redis Test Container
	redisAddr, redisContainer, err := utils.SetupRedisTestContainer("6379")
	require.NoError(t, err)
	defer redisContainer.Terminate(ctx)

	cfg := config.RedisConfig{
		Addr: redisAddr,
		DB:   0,
	}

	// 2. Test successful connection
	rdb, err := db.NewRedisClient(cfg)
	assert.NoError(t, err)
	assert.NotNil(t, rdb)
	if rdb != nil {
		defer rdb.Close()
		// 3. Test ping
		err = rdb.Ping(ctx).Err()
		assert.NoError(t, err)
	}

	// 4. Test invalid address
	cfgInvalid := config.RedisConfig{
		Addr: "localhost:1", // Likely closed port
	}
	rdb2, err2 := db.NewRedisClient(cfgInvalid)
	assert.Error(t, err2)
	assert.Nil(t, rdb2)
}
