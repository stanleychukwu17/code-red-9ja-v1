package partiesservice

import (
	"context"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/notifications"
	"free9ja/api/internal/testutil"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/require"
)

type chapterUsers struct{ UsersService }

func (chapterUsers) GetUserByFakeID(context.Context, int64) (queries.UserWithPlaces, error) {
	return queries.UserWithPlaces{GetUserByFakeIDRow: queries.GetUserByFakeIDRow{
		ID: 1, PartyID: pgtype.Int2{Int16: 1, Valid: true},
	}}, nil
}
func (chapterUsers) StripPartyAdminRoles(context.Context, int64, int64) error    { return nil }
func (chapterUsers) UpdateUserParty(context.Context, int64, *int16, int64) error { return nil }

type chapterNotifications struct{ NotificationsService }

func (chapterNotifications) NotifyNewMemberJoined(context.Context, notifications.NotifyNewMemberJoinedParams) {
}

type chapterFollows struct{}

func (chapterFollows) FollowParty(context.Context, int64, int16, int32) error { return nil }

func TestChapterCachesFollowJoinLeaveAndMembershipStatus(t *testing.T) {
	ctx := context.Background()
	pool := testutil.ElectionDB(t)
	rdb := testutil.Redis(t, 2)
	q := queries.New(pool)
	s := &PartiesService{queries: q, pool: pool, rdb: rdb,
		usersService: chapterUsers{}, notificationsService: chapterNotifications{}, followsService: chapterFollows{}}
	_, err := pool.Exec(ctx, `
INSERT INTO users (fake_id,password_hash,current_country,current_state,party_id) VALUES (101,'test',1,1,1);
INSERT INTO party_chapters (id,party_id,chapter_type,state_id) VALUES (1,1,'state',1),(2,1,'state',1);
INSERT INTO party_membership (user_id,party_id,chapter_id,status) VALUES (1,1,1,'active');`)
	require.NoError(t, err)
	require.NoError(t, rdb.Set(ctx, db.RedisPartyMemberSuspension+"1:1", `{}`, time.Hour).Err())
	chapters, err := s.GetUserPartyChapters(ctx, 1, 1)
	require.NoError(t, err)
	require.Len(t, chapters, 1)
	// An existing party member joins another chapter without changing party_id.
	require.NoError(t, s.JoinParty(ctx, JoinPartyParams{PartyID: 1, ChapterID: 2, ChapterType: "state", UserID: 1, UserFID: 101}))
	require.Zero(t, rdb.Exists(ctx, db.RedisUserPartyChapters+"1:1").Val())
	chapters, err = s.GetUserPartyChapters(ctx, 1, 1)
	require.NoError(t, err)
	require.Len(t, chapters, 2)
	// Suspension and reinstatement share the party membership invalidator.
	_, err = q.SuspendPartyMembership(ctx, queries.SuspendPartyMembershipParams{PartyID: 1, UserID: 1})
	require.NoError(t, err)
	s.InvalidatePartyMembership(ctx, 1, 1)
	chapters, err = s.GetUserPartyChapters(ctx, 1, 1)
	require.NoError(t, err)
	require.Empty(t, chapters)
	_, err = q.ReactivatePartyMembership(ctx, queries.ReactivatePartyMembershipParams{PartyID: 1, UserID: 1})
	require.NoError(t, err)
	s.InvalidatePartyMembership(ctx, 1, 1)
	chapters, err = s.GetUserPartyChapters(ctx, 1, 1)
	require.NoError(t, err)
	require.Len(t, chapters, 2)
	require.NoError(t, s.LeaveParty(ctx, 1, 1, 101))
	require.Zero(t, rdb.Exists(ctx, db.RedisUserPartyChapters+"1:1").Val())
	chapters, err = s.GetUserPartyChapters(ctx, 1, 1)
	require.NoError(t, err)
	require.Empty(t, chapters)
}
