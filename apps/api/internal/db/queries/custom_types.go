package queries

// UserWithPlaces extends the base User struct with additional resolved fields
// like location names, verifications, basic party info, and roles.
type UserWithPlaces struct {
	User
	CountryName    string                           `json:"country_name"`
	StateName      string                           `json:"state_name"`
	CityName       string                           `json:"city_name"`
	Verifications  []GetPageVerificationsRow        `json:"verifications"`
	PartyBasicInfo *PartyBasicInfoWithVerifications `json:"party_basic_info"`
	Roles          []GetUserRolesRow                `json:"roles"`
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
