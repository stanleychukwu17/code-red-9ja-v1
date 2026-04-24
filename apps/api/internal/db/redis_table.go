package db

const (
	// SET: RedisRegisteredUsernames is the Redis set key used to store and check for existing usernames.
	RedisRegisteredUsernames = "registered_usernames"
	// SET: RedisRegisteredEmails is the Redis set key used to store and check for existing email addresses.
	RedisRegisteredEmails = "registered_emails"
	// SET: RedisRegisteredPhones is the Redis set key used to store and check for existing phone numbers.
	RedisRegisteredPhones = "registered_phones"
	// SET: RedisRegisteredNins is the Redis set key used to store and check for existing National Identification Numbers.
	RedisRegisteredNins = "registered_nins"
)
