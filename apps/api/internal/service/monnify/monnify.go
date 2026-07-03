// Package monnify provides a minimal HTTP client for the Monnify payment API.
//
// It handles:
//   - OAuth token acquisition and transparent refresh (token is cached until
//     30 seconds before expiry to avoid clock-skew races).
//   - Creating reserved virtual accounts (bank-transfer collection accounts).
//   - HMAC-SHA512 webhook signature verification.
package monnify

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Config holds all credentials and settings needed to talk to Monnify.
type Config struct {
	// BaseURL is the Monnify API root.
	// Sandbox:    https://sandbox.monnify.com
	// Production: https://api.monnify.com
	BaseURL string

	// APIKey and SecretKey are obtained from the Monnify Dashboard.
	APIKey    string
	SecretKey string

	// ContractCode is the unique identifier for your business contract on Monnify.
	ContractCode string
}

// Client is a thread-safe Monnify HTTP client.
type Client struct {
	cfg        Config
	http       *http.Client
	mu         sync.Mutex
	token      string
	tokenExpAt time.Time
}

// New creates a new Monnify client with the given configuration.
func New(cfg Config) *Client {
	return &Client{
		cfg:  cfg,
		http: &http.Client{Timeout: 30 * time.Second},
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────────

type authResponse struct {
	RequestSuccessful bool   `json:"requestSuccessful"`
	ResponseMessage   string `json:"responseMessage"`
	ResponseCode      string `json:"responseCode"`
	ResponseBody      struct {
		AccessToken string  `json:"accessToken"`
		ExpiresIn   float64 `json:"expiresIn"` // seconds
	} `json:"responseBody"`
}

// getToken returns a valid Bearer token, refreshing it automatically when it is
// about to expire.
func (c *Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Return cached token if it is still valid (with 30-second buffer).
	if c.token != "" && time.Now().Add(30*time.Second).Before(c.tokenExpAt) {
		return c.token, nil
	}

	// Build Basic auth header: base64(apiKey:secretKey)
	creds := base64.StdEncoding.EncodeToString([]byte(c.cfg.APIKey + ":" + c.cfg.SecretKey))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.cfg.BaseURL+"/api/v1/auth/login", http.NoBody)
	if err != nil {
		return "", fmt.Errorf("monnify: build auth request: %w", err)
	}
	req.Header.Set("Authorization", "Basic "+creds)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("monnify: auth request: %w", err)
	}
	defer resp.Body.Close()

	var ar authResponse
	if err := json.NewDecoder(resp.Body).Decode(&ar); err != nil {
		return "", fmt.Errorf("monnify: decode auth response: %w", err)
	}
	if !ar.RequestSuccessful {
		return "", fmt.Errorf("monnify: auth failed: %s (%s)", ar.ResponseMessage, ar.ResponseCode)
	}

	c.token = ar.ResponseBody.AccessToken
	c.tokenExpAt = time.Now().Add(time.Duration(ar.ResponseBody.ExpiresIn) * time.Second)
	return c.token, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Reserved Accounts
// ──────────────────────────────────────────────────────────────────────────────

// AccountNumber represents a single bank account number issued by Monnify for a
// reserved account.
type AccountNumber struct {
	AccountNumber string `json:"accountNumber"`
	AccountName   string `json:"accountName"`
	BankName      string `json:"bankName"`
	BankCode      string `json:"bankCode"`
}

// ReservedAccountRequest is the payload sent to Monnify to create a reserved
// virtual account.
type ReservedAccountRequest struct {
	// AccountReference is your unique identifier for this account — stored in
	// party_wallets.account_reference.
	AccountReference string `json:"accountReference"`
	// AccountName is the display name shown on bank transfers.
	AccountName string `json:"accountName"`
	CurrencyCode string `json:"currencyCode"`
	ContractCode string `json:"contractCode"`
	CustomerEmail string `json:"customerEmail"`
	CustomerName  string `json:"customerName"`
	// CustomerBvn / CustomerNin — at least one is required for CBN compliance.
	CustomerBvn string `json:"customerBvn,omitempty"`
	CustomerNin string `json:"nin,omitempty"`
	// PreferredBanks restricts which banks issue account numbers; leave nil for all.
	PreferredBanks []string `json:"preferredBanks,omitempty"`
	// GetAllAvailableBanks controls whether to reserve accounts for all banks
	GetAllAvailableBanks bool `json:"getAllAvailableBanks"`
}

// ReservedAccountResponse contains the data returned by Monnify after
// successfully creating a reserved account.
type ReservedAccountResponse struct {
	AccountReference string          `json:"accountReference"`
	AccountName      string          `json:"accountName"`
	CurrencyCode     string          `json:"currencyCode"`
	ContractCode     string          `json:"contractCode"`
	CustomerEmail    string          `json:"customerEmail"`
	AccountNumbers   []AccountNumber `json:"accountNumbers"`
	// Status is Monnify's reservation status (e.g. "ACTIVE").
	Status string `json:"reservationStatus"`
}

// UnmarshalJSON normalises Monnify reserved-account payloads.
// The v2 API returns bank details in "accounts"; older responses may use
// "accountNumbers" or a single top-level "accountNumber".
func (r *ReservedAccountResponse) UnmarshalJSON(data []byte) error {
	type reservedAccountResponse ReservedAccountResponse
	raw := struct {
		reservedAccountResponse
		Accounts            []AccountNumber `json:"accounts"`
		SingleAccountNumber string          `json:"accountNumber"`
		BankName            string          `json:"bankName"`
		BankCode            string          `json:"bankCode"`
		StatusField         string          `json:"status"`
	}{}

	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	*r = ReservedAccountResponse(raw.reservedAccountResponse)

	switch {
	case len(raw.Accounts) > 0:
		r.AccountNumbers = raw.Accounts
	case len(r.AccountNumbers) == 0 && raw.SingleAccountNumber != "":
		r.AccountNumbers = []AccountNumber{{
			AccountNumber: raw.SingleAccountNumber,
			AccountName:   r.AccountName,
			BankName:      raw.BankName,
			BankCode:      raw.BankCode,
		}}
	}

	if r.Status == "" {
		r.Status = raw.StatusField
	}

	return nil
}

type reservedAccountAPIResponse struct {
	RequestSuccessful bool                    `json:"requestSuccessful"`
	ResponseMessage   string                  `json:"responseMessage"`
	ResponseCode      string                  `json:"responseCode"`
	ResponseBody      ReservedAccountResponse `json:"responseBody"`
}

func parseReservedAccountAPIResponse(rawBody []byte) (*ReservedAccountResponse, error) {
	var ar reservedAccountAPIResponse
	if err := json.Unmarshal(rawBody, &ar); err != nil {
		return nil, fmt.Errorf("monnify: decode reserved-account response: %w", err)
	}
	if !ar.RequestSuccessful {
		return nil, fmt.Errorf("monnify: reserved-account failed: %s (%s)", ar.ResponseMessage, ar.ResponseCode)
	}
	if len(ar.ResponseBody.AccountNumbers) == 0 {
		return nil, fmt.Errorf("monnify: reserved-account succeeded but returned no account numbers")
	}
	return &ar.ResponseBody, nil
}

func isDuplicateAccountReferenceResponse(rawBody []byte) bool {
	var ar reservedAccountAPIResponse
	if err := json.Unmarshal(rawBody, &ar); err != nil {
		return false
	}
	msg := strings.ToLower(ar.ResponseMessage)
	return strings.Contains(msg, "same reference") ||
		strings.Contains(msg, "already exist") ||
		strings.Contains(msg, "already exists")
}

// GetReservedAccount fetches an existing reserved account from Monnify by reference.
func (c *Client) GetReservedAccount(ctx context.Context, accountReference string) (*ReservedAccountResponse, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, err
	}

	path := c.cfg.BaseURL + "/api/v2/bank-transfer/reserved-accounts/" + url.PathEscape(accountReference)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, fmt.Errorf("monnify: build get reserved-account request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("monnify: get reserved-account request: %w", err)
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("monnify: read get reserved-account response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("monnify: get reserved-account HTTP %d: %s", resp.StatusCode, string(rawBody))
	}

	return parseReservedAccountAPIResponse(rawBody)
}

// CreateReservedAccount calls Monnify to provision a permanent virtual bank
// account for a party. The returned AccountNumbers slice contains one entry per
// partner bank.
func (c *Client) CreateReservedAccount(ctx context.Context, req ReservedAccountRequest) (*ReservedAccountResponse, error) {
	// Inject the contract code from config if the caller left it blank.
	if req.ContractCode == "" {
		req.ContractCode = c.cfg.ContractCode
	}
	if req.CurrencyCode == "" {
		req.CurrencyCode = "NGN"
	}
	// Default to getting all available banks if PreferredBanks is empty.
	if len(req.PreferredBanks) == 0 {
		req.GetAllAvailableBanks = true
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("monnify: marshal reserved-account request: %w", err)
	}

	token, err := c.getToken(ctx)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.cfg.BaseURL+"/api/v2/bank-transfer/reserved-accounts",
		bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("monnify: build reserved-account request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("monnify: reserved-account request: %w", err)
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("monnify: read reserved-account response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		if resp.StatusCode == http.StatusUnprocessableEntity && isDuplicateAccountReferenceResponse(rawBody) {
			return c.GetReservedAccount(ctx, req.AccountReference)
		}
		return nil, fmt.Errorf("monnify: reserved-account HTTP %d: %s", resp.StatusCode, string(rawBody))
	}

	return parseReservedAccountAPIResponse(rawBody)
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhook signature verification
// ──────────────────────────────────────────────────────────────────────────────

// VerifyWebhookSignature checks whether the `monnify-signature` header value
// matches the HMAC-SHA512 of the raw request body signed with the client secret.
//
// Always call this before processing any webhook event.
func (c *Client) VerifyWebhookSignature(body []byte, signature string) bool {
	mac := hmac.New(sha512.New, []byte(c.cfg.SecretKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
