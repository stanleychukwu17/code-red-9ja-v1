package feedhandler

import (
	"context"
	"encoding/json"
	"net/http"

	apimiddleware "free9ja/api/internal/middleware"
	feedservice "free9ja/api/internal/service/feed"
	"free9ja/api/internal/utils"
)

type FeedService interface {
	CreatePost(ctx context.Context, input feedservice.CreatePostInput) (*feedservice.CreatePostResponse, error)
}

type Handler struct {
	service FeedService
	utils   *utils.Utils
}

func NewHandler(service FeedService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

// CreatePost godoc
// @Summary      Create a new feed post
// @Description  Creates a communication post in a campaign group, party wall, or chapter timeline with optional media attachments
// @Tags         Feed
// @Accept       json
// @Produce      json
// @Param        payload body feedservice.CreatePostInput true "Post creation payload"
// @Success      201  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /feed/posts [post]
func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Authentication required to create a post")
		return
	}

	var input feedservice.CreatePostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	input.AuthorID = claims.UserID

	res, err := h.service.CreatePost(r.Context(), input)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Feed post created successfully", res)
}
