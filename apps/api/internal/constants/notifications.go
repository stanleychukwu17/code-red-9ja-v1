package constants

import (
	"fmt"
	"time"
)

// Notification Priorities
const (
	NotificationPriorityLow    = "low"
	NotificationPriorityNormal = "normal"
	NotificationPriorityHigh   = "high"
	NotificationPriorityUrgent = "urgent"
)

// User Notification Categories
const (
	NotificationCategorySocial   = "social"
	NotificationCategoryElection = "election"
	NotificationCategoryParty    = "party"
	NotificationCategoryWallet   = "wallet"
	NotificationCategoryCampaign = "campaign"
	NotificationCategorySecurity = "security"
	NotificationCategorySystem   = "system"
)

// Party Notification Categories
const (
	PartyNotificationCategoryMembership       = "membership"
	PartyNotificationCategoryAgentRecruitment = "agent_recruitment"
	PartyNotificationCategoryElectionOps      = "election_ops"
	PartyNotificationCategoryFinance          = "finance"
	PartyNotificationCategoryCampaign         = "campaign"
	PartyNotificationCategorySystem           = "system"
)

// Common Notification Types
const (
	NotificationTypeNewMemberJoined          = "new_member_joined"
	NotificationTypeNewFollower              = "new_follower"
	NotificationTypePostComment              = "post_comment"
	NotificationTypePartyMembershipApproved  = "party_membership_approved"
	NotificationTypePartyMembershipRejected  = "party_membership_rejected"
	NotificationTypeAgentApplicationApproved = "agent_application_approved"
	NotificationTypeAgentApplicationRejected = "agent_application_rejected"
	NotificationTypeAgentPayoutCredited      = "agent_payout_credited"
	NotificationTypePUResultFlagged          = "pu_result_flagged"
	NotificationTypeNewAgentApplication      = "new_agent_application"
	NotificationTypePartyMemberSuspended     = "party_member_suspended"
	NotificationTypePartyMemberReinstated    = "party_member_reinstated"
	NotificationTypePartyUserBlocked         = "party_user_blocked"
	NotificationTypePartyUserUnblocked       = "party_user_unblocked"
)

// DailyGroupKey formats a time-windowed daily rollup key (e.g. "prefix:2026-09-27")
// to prevent events occurring weeks or months apart from updating stale historical rows.
func DailyGroupKey(prefix string) string {
	return prefix + ":" + time.Now().UTC().Format("2006-01-02")
}

// HourlyGroupKey formats a time-windowed hourly rollup key (e.g. "prefix:2026-09-27-14")
func HourlyGroupKey(prefix string) string {
	return prefix + ":" + time.Now().UTC().Format("2006-01-02-15")
}

// GroupKeyPartyNewMembers returns a daily time-windowed rollup group key for new members joining a party/chapter.
func GroupKeyPartyNewMembers(partyID int16, chapterID int32) string {
	prefix := fmt.Sprintf("party:%d:chapter:%d:new_members", partyID, chapterID)
	return DailyGroupKey(prefix)
}
