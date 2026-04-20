package authrouter

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type AuthRouter struct {
}

func NewAuthRouter() *AuthRouter {
	return &AuthRouter{}
}

func (a *AuthRouter) Routes() chi.Router {
	// Register auth routes here
	r := chi.NewRouter()

	r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement login logic
	})

	r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement register logic
	})

	r.Post("/forgot_password", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement forgot password logic
	})

	return r
}
