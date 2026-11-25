package worker

import (
	"encoding/json"
	"testing"
)

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
