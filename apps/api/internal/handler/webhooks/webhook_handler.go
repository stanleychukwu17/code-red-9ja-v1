// Package webhookshandler handles inbound webhook events from Monnify.
//
// The single endpoint POST /api/v1/webhooks/monnify:
//  1. Reads the raw request body (must be read before JSON decoding for signature verification).
//  2. Verifies the HMAC-SHA512 signature in the monnify-signature header.
//  3. Only processes events of type "SUCCESSFUL_TRANSACTION".
//  4. Credits the correct party wallet using an idempotent CreditWallet call.
//  5. Always responds 200 OK so Monnify does not re-queue the event.
package webhookshandler

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"
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

// Handler handles Monnify webhook events.
type Handler struct {
	walletService     WalletService
	userWalletService UserWalletService
	monnify           *monnifyclient.Client
	utils             *utils.Utils
}

// NewHandler creates a new webhook Handler.
func NewHandler(walletService WalletService, userWalletService UserWalletService, monnify *monnifyclient.Client, u *utils.Utils) *Handler {
	return &Handler{
		walletService:     walletService,
		userWalletService: userWalletService,
		monnify:           monnify,
		utils:             u,
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Monnify webhook payload shapes
// ──────────────────────────────────────────────────────────────────────────────

// monnifyWebhookPayload is the top-level envelope sent by Monnify for all events.
type monnifyWebhookPayload struct {
	EventType string                 `json:"eventType"`
	EventData monnifyWebhookEventData `json:"eventData"`
}

// monnifyWebhookEventData contains the fields present for a
// SUCCESSFUL_TRANSACTION event. Only the fields we need are mapped.
type monnifyWebhookEventData struct {
	// TransactionReference is Monnify's unique identifier — used for idempotency.
	TransactionReference string `json:"transactionReference"`

	// PaymentReference is the customer-visible reference on their bank statement.
	PaymentReference string `json:"paymentReference"`

	// AmountPaid is in Naira (float); we convert to Kobo.
	AmountPaid float64 `json:"amountPaid"`

	// The reserved account that received the transfer.
	Product struct {
		Reference string `json:"reference"` // maps to account_reference in party_wallets
		Type      string `json:"type"`      // should be "RESERVED_ACCOUNT"
	} `json:"product"`

	// Payer details (optional — may be absent for some bank transfers).
	SourceAccountDetails struct {
		AccountName   string `json:"accountName"`
		AccountNumber string `json:"accountNumber"`
		BankCode      string `json:"bankCode"`
	} `json:"sourceAccountDetails"`

	Narration string `json:"narration"`
}

// ──────────────────────────────────────────────────────────────────────────────
// HandleMonnify — the HTTP handler
// ──────────────────────────────────────────────────────────────────────────────

// HandleMonnify godoc
// @Summary      Monnify payment webhook
// @Description  Receives and processes Monnify payment notification events. Verifies the HMAC-SHA512 signature, then credits the appropriate party wallet for SUCCESSFUL_TRANSACTION events.
// @Tags         Webhooks
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Event processed"
// @Failure      400  {object} map[string]interface{} "Invalid signature or payload"
// @Router       /webhooks/monnify [post]
func (h *Handler) HandleMonnify(w http.ResponseWriter, r *http.Request) {
	log := slog.Default().With("handler", "HandleMonnify")

	// 1. Read the raw body BEFORE decoding (needed for signature verification).
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		log.Error("failed to read webhook body", "err", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	// 2. Verify the HMAC-SHA512 signature.
	signature := r.Header.Get("monnify-signature")
	if h.monnify != nil && !h.monnify.VerifyWebhookSignature(rawBody, signature) {
		log.Warn("invalid Monnify webhook signature", "signature", signature)
		// Respond 200 anyway — Monnify retries on non-200; returning 400 here
		// would cause a retry storm for genuinely invalid requests.
		h.utils.RespondSuccess(w, http.StatusOK, "Signature verification failed — event ignored", nil)
		return
	}

	// 3. Decode the payload.
	var payload monnifyWebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		log.Error("failed to decode webhook payload", "err", err)
		h.utils.RespondSuccess(w, http.StatusOK, "Invalid payload — event ignored", nil)
		return
	}

	log.Info("received Monnify webhook", "eventType", payload.EventType,
		"txRef", payload.EventData.TransactionReference)

	// 4. Only process successful payment events.
	if payload.EventType != "SUCCESSFUL_TRANSACTION" {
		h.utils.RespondSuccess(w, http.StatusOK, "Event type not processed", nil)
		return
	}

	ed := payload.EventData

	// 5. Convert Naira → Kobo (1 NGN = 100 Kobo).
	amountKobo := int64(ed.AmountPaid * 100)
	if amountKobo <= 0 {
		h.utils.RespondSuccess(w, http.StatusOK, "Zero-amount event — ignored", nil)
		return
	}

	// Check if this reference is for a user wallet or a party wallet
	if strings.HasPrefix(ed.Product.Reference, "free9ja-user-") {
		if h.userWalletService == nil {
			log.Error("user wallet service is not configured")
			h.utils.RespondSuccess(w, http.StatusOK, "User wallet service not configured — event ignored", nil)
			return
		}

		wallet, err := h.userWalletService.GetUserWalletByAccountReference(r.Context(), ed.Product.Reference)
		if err != nil {
			log.Error("user wallet not found for account reference", "reference", ed.Product.Reference, "err", err)
			h.utils.RespondSuccess(w, http.StatusOK, "User wallet not found — event ignored", nil)
			return
		}

		_, err = h.userWalletService.CreditUserWallet(
			r.Context(),
			wallet.ID,
			amountKobo,
			ed.TransactionReference,
			ed.SourceAccountDetails.AccountName,
			ed.SourceAccountDetails.AccountNumber,
			ed.SourceAccountDetails.BankCode,
			ed.Narration,
			rawBody,
		)
		if err != nil {
			log.Error("failed to credit user wallet", "walletID", wallet.ID, "txRef", ed.TransactionReference, "err", err)
			h.utils.RespondSuccess(w, http.StatusOK, "Credit failed — check server logs", nil)
			return
		}

		log.Info("user wallet credited", "walletID", wallet.ID, "amountKobo", amountKobo, "txRef", ed.TransactionReference)
	} else {
		wallet, err := h.walletService.GetWalletByAccountReference(r.Context(), ed.Product.Reference)
		if err != nil {
			log.Error("party wallet not found for account reference", "reference", ed.Product.Reference, "err", err)
			h.utils.RespondSuccess(w, http.StatusOK, "Party wallet not found — event ignored", nil)
			return
		}

		_, err = h.walletService.CreditWallet(
			r.Context(),
			wallet.ID,
			amountKobo,
			ed.TransactionReference,
			ed.SourceAccountDetails.AccountName,
			ed.SourceAccountDetails.AccountNumber,
			ed.SourceAccountDetails.BankCode,
			ed.Narration,
			rawBody,
		)
		if err != nil {
			log.Error("failed to credit party wallet", "walletID", wallet.ID, "txRef", ed.TransactionReference, "err", err)
			h.utils.RespondSuccess(w, http.StatusOK, "Credit failed — check server logs", nil)
			return
		}

		log.Info("party wallet credited", "walletID", wallet.ID, "amountKobo", amountKobo, "txRef", ed.TransactionReference)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Payment processed", nil)
}
