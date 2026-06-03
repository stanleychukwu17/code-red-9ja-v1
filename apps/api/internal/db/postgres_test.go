package db_test

import (
	"context"
	"testing"

	"free9ja/api/internal/db"
	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewPostgresPool(t *testing.T) {
	ctx := context.Background()

	// database variables
	user := "user"
	password := "password"
	db_name := "free9ja_db"

	// 1. Setup Postgres Test Container
	pgConfig, pgContainer, err := utils.SetupPostgresTestContainer(user, password, db_name, "5432")
	require.NoError(t, err)
	defer pgContainer.Terminate(ctx)

	// create db connection url
	dsn := utils.FormatPostgresDSN(user, password, pgConfig.Host, pgConfig.Port, db_name)

	// 2. Test successful connection
	pool, err := db.NewPostgresPool(ctx, dsn)
	assert.NoError(t, err)
	assert.NotNil(t, pool)
	if pool != nil {
		defer pool.Close()

		// 3. Test ping
		err = pool.Ping(ctx)
		assert.NoError(t, err)
	}

	// 4. Test invalid connection string
	pool2, err2 := db.NewPostgresPool(ctx, "invalid-url")
	assert.Error(t, err2)
	assert.Nil(t, pool2)
}
