package queries

type UserWithPlaces struct {
	User
	CountryName   string                    `json:"country_name"`
	StateName     string                    `json:"state_name"`
	CityName      string                    `json:"city_name"`
	Verifications []GetPageVerificationsRow `json:"verifications"`
}
