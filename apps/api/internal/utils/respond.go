package utils

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
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
