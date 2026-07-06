package main

import (
	"context"
	"fmt"

	"free9ja/api/internal/config"
	monnifyservice "free9ja/api/internal/service/monnify"
)

func main() {
	cfg := config.Load()
	client := monnifyservice.New(monnifyservice.Config{
		BaseURL:      cfg.Monnify.BaseURL,
		APIKey:       cfg.Monnify.APIKey,
		SecretKey:    cfg.Monnify.SecretKey,
		ContractCode: cfg.Monnify.ContractCode,
	})

	// Pass a mock BVN (11 digits) or NIN (11 digits)
	resp, err := client.CreateReservedAccount(context.Background(), monnifyservice.ReservedAccountRequest{
		AccountReference: "free9ja-test-bvn-99999",
		AccountName:      "Test User BVN",
		CustomerEmail:    "testbvn@free9ja.com",
		CustomerName:     "Test User BVN",
		CustomerBvn:      "22222222222", // Mock 11-digit BVN
	})
	if err != nil {
		fmt.Printf("ERROR: %v\n", err)
		return
	}

	fmt.Printf("SUCCESS: %+v\n", resp)
	if len(resp.AccountNumbers) > 0 {
		fmt.Printf("Accounts: %+v\n", resp.AccountNumbers)
	} else {
		fmt.Println("No accounts were generated.")
	}
}
