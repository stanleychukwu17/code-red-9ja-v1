package usersservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/testutil"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

type profileParties struct {
	chapters []queries.GetUserPartyChaptersRow
	calls    atomic.Int32
}

func (p *profileParties) GetPartyBasicInfo(context.Context, int16) *queries.PartyBasicInfoWithVerifications {
	return nil
}
func (p *profileParties) GetUserPartyChapters(context.Context, int64, int16) ([]queries.GetUserPartyChaptersRow, error) {
	p.calls.Add(1)
	return p.chapters, nil
}

type profileElections struct{ err error }

func (e profileElections) GetUserActiveCandidacies(context.Context, int64) ([]queries.UserActiveCandidacy, error) {
	return nil, e.err
}

type profileBodies struct{}

func (profileBodies) GetLocationNames(context.Context, int16, int16, int32) (string, string, string) {
	return "Nigeria", "Lagos", ""
}

func TestProfileColdCacheAndPartyAffiliationInvalidation(t *testing.T) {
	ctx := context.Background()
	pool := testutil.ElectionDB(t)
	rdb := testutil.Redis(t, 1)
	q := queries.New(pool)
	_, err := pool.Exec(ctx, `INSERT INTO users (fake_id,password_hash,current_country,current_state,party_id)
VALUES (101,'test',1,1,1)`)
	require.NoError(t, err)
	s := &UsersService{queries: q, rdb: rdb, bodiesService: profileBodies{},
		partyService: &profileParties{chapters: []queries.GetUserPartyChaptersRow{{ID: 9}}}, electionsService: profileElections{}}
	user, err := s.GetUserByFakeID(ctx, 101)
	require.NoError(t, err)
	require.EqualValues(t, 1, user.ID)
	require.EqualValues(t, 9, user.Chapters[0].ID)
	raw := rdb.Get(ctx, db.RedisUserInfo+"101").Val()
	var stored map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(raw), &stored))
	for _, field := range []string{"chapters", "candidacies", "party_basic_info"} {
		require.NotContains(t, stored, field)
	}
	for _, key := range []string{db.RedisUserPartyChapters + "1:1", db.RedisUserPartyChapters + "2:1", db.RedisUserActiveCandidacies + "1"} {
		require.NoError(t, rdb.Set(ctx, key, "[]", time.Hour).Err())
	}
	newParty := int16(2)
	require.NoError(t, s.UpdateUserParty(ctx, 1, &newParty, 101))
	for _, key := range []string{db.RedisUserInfo + "101", db.RedisUserPartyChapters + "1:1", db.RedisUserPartyChapters + "2:1", db.RedisUserActiveCandidacies + "1"} {
		require.Zero(t, rdb.Exists(ctx, key).Val(), key)
	}
}

func TestCoreProfileExcludesRelationships(t *testing.T) {
	user := queries.UserWithPlaces{
		PartyBasicInfo: &queries.PartyBasicInfoWithVerifications{},
		Chapters:       []queries.GetUserPartyChaptersRow{{ID: 1}},
		Candidacies:    []queries.UserActiveCandidacy{{GetUserActiveCandidaciesRow: queries.GetUserActiveCandidaciesRow{ElectionID: 1}}},
	}
	raw, err := json.Marshal(coreProfile(user))
	require.NoError(t, err)
	var stored map[string]interface{}
	require.NoError(t, json.Unmarshal(raw, &stored))
	for _, key := range []string{"party_basic_info", "chapters", "candidacies"} {
		require.NotContains(t, stored, key)
	}
}

func TestProfilesBatchRelationshipsAndRefreshWithoutEvictingCore(t *testing.T) {
	ctx := context.Background()
	rdb := testutil.Redis(t, 1)
	put := func(key string, value interface{}) {
		raw, err := json.Marshal(value)
		require.NoError(t, err)
		require.NoError(t, rdb.Set(ctx, key, raw, time.Hour).Err())
	}
	for id := int64(1); id <= 2; id++ {
		user := queries.UserWithPlaces{GetUserByFakeIDRow: queries.GetUserByFakeIDRow{
			ID: id, FakeID: pgtype.Int8{Int64: id + 100, Valid: true}, PartyID: pgtype.Int2{Int16: 1, Valid: true},
		}}
		put(fmt.Sprintf("%s%d", db.RedisUserInfo, id+100), coreProfile(user))
		put(fmt.Sprintf("%s1:%d", db.RedisUserPartyChapters, id), []queries.GetUserPartyChaptersRow{{ID: int32(id) * 10}})
		put(fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, id), []queries.UserActiveCandidacy{{GetUserActiveCandidaciesRow: queries.GetUserActiveCandidaciesRow{ElectionID: int32(id)}}})
	}
	put(fmt.Sprintf("%s%d", db.RedisPartyByID, 1), queries.Party{ID: 1})
	parties := &profileParties{chapters: []queries.GetUserPartyChaptersRow{{ID: 99}}}
	s := &UsersService{rdb: rdb, partyService: parties, electionsService: profileElections{}}
	var mgets atomic.Int32
	var relationshipKeys atomic.Int32
	rdb.AddHook(testutil.RedisObserver{Before: func(_ context.Context, cmd redis.Cmder) {
		if cmd.Name() == "mget" {
			mgets.Add(1)
			if len(cmd.Args()) == 6 {
				relationshipKeys.Store(5)
			} // two users, one shared party
		}
	}})
	users, err := s.GetUsersByFakeIDs(ctx, []int64{101, 102})
	require.NoError(t, err)
	require.EqualValues(t, 2, mgets.Load())
	require.EqualValues(t, 5, relationshipKeys.Load())
	require.Zero(t, parties.calls.Load())
	require.EqualValues(t, 10, users[0].Chapters[0].ID)
	require.EqualValues(t, 2, users[1].Candidacies[0].ElectionID)
	coreBefore, err := rdb.Get(ctx, db.RedisUserInfo+"101").Result()
	require.NoError(t, err)
	// A chapter mutation clears only its owning cache. The core profile stays hot.
	require.NoError(t, rdb.Del(ctx, db.RedisUserPartyChapters+"1:1").Err())
	user, err := s.GetUserByFakeID(ctx, 101)
	require.NoError(t, err)
	require.EqualValues(t, 99, user.Chapters[0].ID)
	require.EqualValues(t, 1, parties.calls.Load())
	require.Equal(t, coreBefore, rdb.Get(ctx, db.RedisUserInfo+"101").Val())

	// Candidacy must not disappear merely because current party affiliation is empty.
	user.PartyID = pgtype.Int2{}
	put(db.RedisUserInfo+"101", coreProfile(user))
	user, err = s.GetUserByFakeID(ctx, 101)
	require.NoError(t, err)
	require.Len(t, user.Candidacies, 1)
	require.Empty(t, user.Chapters)
	require.NotNil(t, user.Chapters)
}

func TestRelationshipFailureDoesNotCacheAnEmptyProfileSnapshot(t *testing.T) {
	ctx := context.Background()
	rdb := testutil.Redis(t, 1)
	user := queries.UserWithPlaces{GetUserByFakeIDRow: queries.GetUserByFakeIDRow{ID: 1}}
	raw, err := json.Marshal(coreProfile(user))
	require.NoError(t, err)
	require.NoError(t, rdb.Set(ctx, db.RedisUserInfo+"101", raw, time.Hour).Err())
	s := &UsersService{rdb: rdb, electionsService: profileElections{err: errors.New("database unavailable")}}
	_, err = s.GetUserByFakeID(ctx, 101)
	require.ErrorContains(t, err, "database unavailable")
	require.Equal(t, string(raw), rdb.Get(ctx, db.RedisUserInfo+"101").Val())
	require.Zero(t, rdb.Exists(ctx, db.RedisUserActiveCandidacies+"1").Val())
}
