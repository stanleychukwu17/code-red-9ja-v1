package monnify

import (
	"encoding/json"
	"testing"
)

func TestReservedAccountResponse_UnmarshalJSON_v2Accounts(t *testing.T) {
	raw := []byte(`{
		"contractCode": "222001311614",
		"accountReference": "free9ja-party-1",
		"accountName": "APC - free9ja",
		"currencyCode": "NGN",
		"customerEmail": "party-1@free9ja.com",
		"accounts": [
			{
				"bankCode": "50515",
				"bankName": "Moniepoint Microfinance Bank",
				"accountNumber": "6254727989",
				"accountName": "APC - free9ja"
			}
		],
		"status": "ACTIVE"
	}`)

	var resp ReservedAccountResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(resp.AccountNumbers) != 1 {
		t.Fatalf("AccountNumbers len = %d, want 1", len(resp.AccountNumbers))
	}
	if resp.AccountNumbers[0].AccountNumber != "6254727989" {
		t.Errorf("AccountNumber = %q, want %q", resp.AccountNumbers[0].AccountNumber, "6254727989")
	}
	if resp.Status != "ACTIVE" {
		t.Errorf("Status = %q, want ACTIVE", resp.Status)
	}
}

func TestReservedAccountResponse_UnmarshalJSON_singleAccountNumber(t *testing.T) {
	raw := []byte(`{
		"accountReference": "free9ja-party-2",
		"accountName": "PDP - free9ja",
		"accountNumber": "6834033118",
		"bankName": "Moniepoint Microfinance Bank",
		"bankCode": "50515",
		"status": "ACTIVE"
	}`)

	var resp ReservedAccountResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(resp.AccountNumbers) != 1 {
		t.Fatalf("AccountNumbers len = %d, want 1", len(resp.AccountNumbers))
	}
	if resp.AccountNumbers[0].AccountNumber != "6834033118" {
		t.Errorf("AccountNumber = %q, want %q", resp.AccountNumbers[0].AccountNumber, "6834033118")
	}
}

func TestIsDuplicateAccountReferenceResponse(t *testing.T) {
	raw := []byte(`{"requestSuccessful":false,"responseMessage":"You cannot reserve an account with the same reference","responseCode":"99"}`)
	if !isDuplicateAccountReferenceResponse(raw) {
		t.Fatal("expected duplicate reference detection")
	}
}

func TestCreateReservedAccountResponseEnvelope_v2(t *testing.T) {
	raw := []byte(`{
		"requestSuccessful": true,
		"responseMessage": "success",
		"responseCode": "0",
		"responseBody": {
			"accountReference": "free9ja-user-1",
			"accountName": "Jane Doe - free9ja",
			"accounts": [
				{
					"accountNumber": "8947206823",
					"accountName": "Jane Doe - free9ja",
					"bankName": "Sterling bank",
					"bankCode": "232"
				}
			],
			"status": "ACTIVE"
		}
	}`)

	var ar reservedAccountAPIResponse
	if err := json.Unmarshal(raw, &ar); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !ar.RequestSuccessful {
		t.Fatal("expected successful response")
	}
	if len(ar.ResponseBody.AccountNumbers) != 1 {
		t.Fatalf("AccountNumbers len = %d, want 1", len(ar.ResponseBody.AccountNumbers))
	}
	if ar.ResponseBody.AccountNumbers[0].AccountNumber != "8947206823" {
		t.Errorf("AccountNumber = %q, want %q", ar.ResponseBody.AccountNumbers[0].AccountNumber, "8947206823")
	}
}
