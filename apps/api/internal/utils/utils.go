package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

type Utils struct {
	db *pgxpool.Pool
}

func NewUtils(db *pgxpool.Pool) *Utils {
	return &Utils{
		db: db,
	}
}

// RespondJSON writes a JSON response with the given status code and body.
func (u *Utils) RespondJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

type PostgresTestConfig struct {
	Host string
	Port string
}

func FormatPostgresDSN(db_user, db_password, db_host, db_port, db_name string) string {
	// "postgres://<username>:<password>@localhost:<port>/<database>?sslmode=disable"
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", db_user, db_password, db_host, db_port, db_name)
}

func SetupPostgresTestContainer(db_user, db_password, db_name, db_port string) (PostgresTestConfig, testcontainers.Container, error) {
	ctx := context.Background()

	// Create container request
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16.3-alpine3.20",
		ExposedPorts: []string{fmt.Sprintf("%v/tcp", db_port)},
		Env: map[string]string{
			"POSTGRES_USER":     db_user,
			"POSTGRES_PASSWORD": db_password,
			"POSTGRES_DB":       db_name,
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(300 * time.Second),
	}

	// Create and start the container
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return PostgresTestConfig{}, nil, fmt.Errorf("failed to start container: %w", err)
	}

	host, _ := container.Host(ctx)                   // Get container host (IP)
	port, _ := container.MappedPort(ctx, "5432/tcp") // Get mapped port
	// dsn := fmt.Sprintf(
	// 	"host=%s user=%v password=%v dbname=%v port=%v sslmode=disable", host, db_user, db_password, db_name, port.Port(),
	// )

	return PostgresTestConfig{host, port.Port()}, container, nil
}

func SetupRedisTestContainer(redis_port string) (string, testcontainers.Container, error) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "redis:7.2.13-alpine",
		ExposedPorts: []string{fmt.Sprintf("%s/tcp", redis_port)},
		WaitingFor: wait.ForListeningPort(
			fmt.Sprintf("%s/tcp", redis_port),
		).WithStartupTimeout(300 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to start redis container: %w", err)
	}

	host, _ := container.Host(ctx)
	port, _ := container.MappedPort(ctx, fmt.Sprintf("%s/tcp", redis_port))

	addr := fmt.Sprintf("%s:%s", host, port.Port())
	return addr, container, nil
}
