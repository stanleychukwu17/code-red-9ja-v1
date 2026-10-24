package webhookshandler

import (
	"context"
	"net/http"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
)

// WalletService is the interface this handler needs from the parties service.
type WalletService interface {
	GetWalletByAccountReference(ctx context.Context, accountReference string) (queries.PartyWallet, error)
	CreditWallet(
		ctx context.Context,
		walletID int64,
		amountKobo int64,
		transactionReference string,
		payerName, payerAccountNumber, payerBankCode, narration string,
		rawPayload []byte,
	) (queries.PartyWalletTransaction, error)
}

// UserWalletService is the interface this handler needs from the users wallet service.
type UserWalletService interface {
	GetUserWalletByAccountReference(ctx context.Context, accountReference string) (queries.UserWallet, error)
	CreditUserWallet(
		ctx context.Context,
		walletID int64,
		amountKobo int64,
		transactionReference string,
		payerName, payerAccountNumber, payerBankCode, narration string,
		rawPayload []byte,
	) (queries.UserWalletTransaction, error)
}

// Handler handles webhook events.
type Handler struct {
	walletService     WalletService
	userWalletService UserWalletService
	utils             *utils.Utils
}

// NewHandler creates a new webhook Handler.
func NewHandler(walletService WalletService, userWalletService UserWalletService, u *utils.Utils) *Handler {
	return &Handler{
		walletService:     walletService,
		userWalletService: userWalletService,
		utils:             u,
	}
}

// HandleMonnify handles deprecated/legacy Monnify webhook events.
func (h *Handler) HandleMonnify(w http.ResponseWriter, r *http.Request) {
	h.utils.RespondSuccess(w, http.StatusOK, "Monnify webhooks are disabled", nil)
}

