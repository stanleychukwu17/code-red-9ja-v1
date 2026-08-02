package db

const (
	// -- Modules --
	ModuleAdmin      = "admin"       // Represents the administration module of the system
	ModulePartyAdmin = "party_admin" // Represents the party administration module of the system
	ModuleUsers      = "users"       // Represents the users module of the system

	// -- Actions --
	ActionAssignPageVerification = "assign_page_verification"  // Action when a verification badge is assigned to a user's page
	ActionRemovePageVerification = "remove_page_verification"  // Action when a verification badge is removed from a user's page
	ActionUpdateUser             = "update_user"               // Action for updating a user's general profile
	ActionDeleteUserAccount      = "delete_user_account"       // Action for soft deleting a user's account
	ActionUpdateUserMoreInfo     = "update_user_more_info"     // Action for updating a user's more info
	ActionUpdateUserRoles        = "update_user_roles"         // Action for updating a user's roles
	ActionUpdateUserPhoneNumbers = "update_user_phone_numbers" // Action for updating a user's phone numbers
	ActionViewUserPhoneNumbers   = "view_user_phone_numbers"   // Action when a user's phone numbers are viewed
	ActionDeleteUserPhoneNumber  = "delete_user_phone_number"  // Action when a user's phone number is deleted

	// -- Actor Roles --
	ActorRoleAdmin      = "admin"       // A standard administrative user
	ActorRolePartyAdmin = "party_admin" // An administrator for a specific political party
	ActorRoleUser       = "user"        // A regular user acting on their own account

	// -- Entity Types --
	EntityTypeUser  = "user"  // Entity type representing a regular user
	EntityTypeParty = "party" // Entity type representing a political party
)
