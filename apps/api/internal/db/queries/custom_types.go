package queries

import "encoding/json"


// UserWithPlaces extends the base User struct with additional resolved fields
// like location names, verifications, basic party info, and roles.
type UserWithPlaces struct {
	User
	CountryName    string                           `json:"country_name"`
	StateName      string                           `json:"state_name"`
	CityName       string                           `json:"city_name"`
	Verifications  []GetPageVerificationsRow        `json:"verifications"`
	PartyBasicInfo *PartyBasicInfoWithVerifications `json:"party_basic_info"`
	Roles          CachedUserRoles                  `json:"roles"`
}

// PartyWithVerifications extends the base Party struct to include
// a list of active verifications attached to the party.
type PartyWithVerifications struct {
	Party
	Verifications []GetPageVerificationsRow `json:"verifications"`
}

// PartyBasicInfoWithVerifications extends the GetPartyBasicInfoRow struct
// to include a list of active verifications attached to the party.
type PartyBasicInfoWithVerifications struct {
	GetPartyBasicInfoRow
	Verifications []GetPageVerificationsRow `json:"verifications"`
}

// CachedUserRoles holds both full role records and just their codes for efficient access
type CachedUserRoles struct {
	Roles     []GetUserRolesRow `json:"roles"`
	RolesCode []string          `json:"roles_code"`
}

// jsonParty is an alias used exclusively inside MarshalJSON to avoid infinite recursion.
// It mirrors Party exactly but carries no method set, so json.Marshal falls back to
// field-by-field encoding rather than calling MarshalJSON again.
type jsonParty Party

// MarshalJSON ensures the three JSONB columns (stored as []byte by pgx) are embedded
// in the response as proper JSON objects rather than base64-encoded strings.
// An empty or nil slice is normalised to a JSON null so callers can check for it.
func (p Party) MarshalJSON() ([]byte, error) {
	type Alias jsonParty
	type PartyOut struct {
		Alias
		AgentPaymentAllocationKobo json.RawMessage `json:"agent_payment_allocation_kobo"`
		AgentAcquisitionTargets    json.RawMessage `json:"agent_acquisition_targets"`
		AutoAcceptApplications     json.RawMessage `json:"auto_accept_applications"`
	}

	rawAlloc := json.RawMessage(p.AgentPaymentAllocationKobo)
	if len(rawAlloc) == 0 {
		rawAlloc = json.RawMessage("null")
	}
	rawTargets := json.RawMessage(p.AgentAcquisitionTargets)
	if len(rawTargets) == 0 {
		rawTargets = json.RawMessage("null")
	}
	rawAutoAccept := json.RawMessage(p.AutoAcceptApplications)
	if len(rawAutoAccept) == 0 {
		rawAutoAccept = json.RawMessage("null")
	}

	return json.Marshal(PartyOut{
		Alias:                   Alias(jsonParty(p)),
		AgentPaymentAllocationKobo: rawAlloc,
		AgentAcquisitionTargets: rawTargets,
		AutoAcceptApplications:  rawAutoAccept,
	})
}

// jsonUsersPhoneNumber is an alias used exclusively inside MarshalJSON to avoid infinite recursion.
type jsonUsersPhoneNumber UsersPhoneNumber

func (up UsersPhoneNumber) MarshalJSON() ([]byte, error) {
	type Alias jsonUsersPhoneNumber
	whatsappStr := "no"
	if up.OnWhatsapp.Valid && up.OnWhatsapp.Bool {
		whatsappStr = "yes"
	}
	type PhoneOut struct {
		Alias
		OnWhatsapp string `json:"on_whatsapp"`
	}
	return json.Marshal(PhoneOut{
		Alias:      Alias(jsonUsersPhoneNumber(up)),
		OnWhatsapp: whatsappStr,
	})
}
