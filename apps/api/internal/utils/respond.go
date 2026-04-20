package utils

import (
	"encoding/json"
	"net/http"
)

// RespondJSON writes a JSON response with the given status code and body.
func RespondJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
