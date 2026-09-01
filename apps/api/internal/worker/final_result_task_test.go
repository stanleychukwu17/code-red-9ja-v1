package worker

import (
	"encoding/json"
	"testing"
)

func TestHashCandidateResults(t *testing.T) {
	// Given two raw JSONs with candidate results in different order
	jsonA := []byte(`[{"party_short_name":"APC","vote_count":120},{"party_short_name":"LP","vote_count":350},{"party_short_name":"PDP","vote_count":80}]`)
	jsonB := []byte(`[{"party_short_name":"LP","vote_count":350},{"party_short_name":"PDP","vote_count":80},{"party_short_name":"APC","vote_count":120}]`)

	hashA := hashCandidateResults(jsonA)
	hashB := hashCandidateResults(jsonB)

	if hashA == "" {
		t.Fatalf("expected non-empty hash, got empty string")
	}

	if hashA != hashB {
		t.Fatalf("expected hashes to match regardless of ordering, got %q != %q", hashA, hashB)
	}

	expected := "APC:120;LP:350;PDP:80;"
	if hashA != expected {
		t.Fatalf("expected hash %q, got %q", expected, hashA)
	}
}

func TestCandidateResultPayloadSerialization(t *testing.T) {
	payload := RollupSingleWardPayload{
		ElectionID:            101,
		WardID:                45,
		LGAID:                 12,
		StateID:               3,
		StateConstituencyID:   18,
		FederalConstituencyID: 9,
		SenatorialDistrictID:  4,
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	var unmarshaled RollupSingleWardPayload
	if err := json.Unmarshal(bytes, &unmarshaled); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if unmarshaled.ElectionID != payload.ElectionID || unmarshaled.WardID != payload.WardID {
		t.Fatalf("unmarshaled mismatch: %+v != %+v", unmarshaled, payload)
	}
}
