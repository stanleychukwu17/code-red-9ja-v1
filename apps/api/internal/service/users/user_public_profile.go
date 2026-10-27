package usersservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"strconv"
	"strings"
)

type UserTimelineBranch struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type UserTimelineEvent struct {
	ID       string               `json:"id"`
	Year     string               `json:"year"`
	Title    string               `json:"title"`
	Branches []UserTimelineBranch `json:"branches,omitempty"`
}

type UserPublicParty struct {
	ID        int16  `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	Since     string `json:"since"`
	Color     string `json:"color"`
	Logo      string `json:"logo"`
}

type UserPublicRole struct {
	Title   string `json:"title"`
	Chapter string `json:"chapter"`
}

type UserPublicProfile struct {
	ID             int64               `json:"id"`
	FakeID         int64               `json:"fake_id"`
	Username       string              `json:"username"`
	Name           string              `json:"name"`
	FirstName      string              `json:"first_name"`
	LastName       string              `json:"last_name"`
	Avatar         string              `json:"avatar"`
	Party          *UserPublicParty    `json:"party,omitempty"`
	Role           *UserPublicRole     `json:"role,omitempty"`
	FollowersCount int64               `json:"followers_count"`
	FollowingCount int64               `json:"following_count"`
	IsFollowing    bool                `json:"is_following"`
	IsPolitician   bool                `json:"is_politician"`
	IsVerified     bool                `json:"is_verified"`
	Location       string              `json:"location,omitempty"`
	Timeline       []UserTimelineEvent `json:"timeline"`
}

// GetUserPublicProfile fetches and hydrates the public profile for a username.
func (s *UsersService) GetUserPublicProfile(ctx context.Context, username string, viewerUserID int64) (*UserPublicProfile, error) {
	cleanUsername := strings.TrimPrefix(strings.TrimSpace(username), "@")
	if cleanUsername == "" {
		return nil, fmt.Errorf("username cannot be empty")
	}

	fakeID, err := s.queries.GetFakeIDByUsername(ctx, utils.PgTextFromString(cleanUsername))
	if err != nil || !fakeID.Valid {
		return nil, fmt.Errorf("user not found: %s", cleanUsername)
	}

	user, err := s.GetUserByFakeID(ctx, fakeID.Int64)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user details: %w", err)
	}

	followersCount, err := s.queries.GetUserFollowersCount(ctx, user.ID)
	if err != nil {
		followersCount = 0
	}

	followingCount, err := s.queries.GetUserFollowingCount(ctx, user.ID)
	if err != nil {
		followingCount = 0
	}

	isFollowing := false
	if viewerUserID > 0 && viewerUserID != user.ID {
		isFollowing, _ = s.queries.IsFollowingUser(ctx, queries.IsFollowingUserParams{
			FollowerID:  viewerUserID,
			FollowingID: user.ID,
		})
	}

	var party *UserPublicParty
	if user.PartyBasicInfo != nil {
		since := ""
		if user.CreatedAt.Valid {
			since = fmt.Sprintf("since %d", user.CreatedAt.Time.Year())
		}
		party = &UserPublicParty{
			ID:        user.PartyBasicInfo.ID,
			Name:      user.PartyBasicInfo.Name,
			ShortName: user.PartyBasicInfo.ShortName,
			Since:     since,
			Color:     user.PartyBasicInfo.ColorHex.String,
			Logo:      user.PartyBasicInfo.Logo,
		}
	}

	roleTitle := "Member"
	chapterName := ""
	if user.PartyBasicInfo != nil {
		chapterName = user.PartyBasicInfo.ShortName + " National"
	} else {
		roleTitle = "Citizen"
	}

	if len(user.Chapters) > 0 {
		ch := user.Chapters[0]
		if ch.ZoneName != "" && user.PartyBasicInfo != nil {
			chapterName = fmt.Sprintf("%s %s", user.PartyBasicInfo.ShortName, ch.ZoneName)
		} else if user.StateName != "" && user.PartyBasicInfo != nil {
			chapterName = fmt.Sprintf("%s %s", user.PartyBasicInfo.ShortName, user.StateName)
		}
	} else if user.StateName != "" {
		chapterName = fmt.Sprintf("%s, %s", user.StateName, user.CountryName)
	}

	if len(user.Roles.Roles) > 0 && user.Roles.Roles[0].Code != "" {
		code := user.Roles.Roles[0].Code
		roleTitle = strings.Title(strings.ReplaceAll(code, "_", " "))
	}

	role := &UserPublicRole{
		Title:   roleTitle,
		Chapter: chapterName,
	}

	milestones, _ := s.queries.ListUserPartyMilestones(ctx, user.ID)
	var timeline []UserTimelineEvent
	for _, m := range milestones {
		evYear := strconv.Itoa(m.CreatedAt.Time.Year())
		title := ""
		switch m.MilestoneType {
		case "joined":
			title = fmt.Sprintf("Joined %s", m.PartyShortName)
		case "left":
			title = fmt.Sprintf("Left %s", m.PartyShortName)
		case "appointed":
			title = fmt.Sprintf("Appointed in %s", m.PartyShortName)
		case "promoted":
			title = fmt.Sprintf("Promoted in %s", m.PartyShortName)
		default:
			title = fmt.Sprintf("%s - %s", m.MilestoneType, m.PartyShortName)
		}
		timeline = append(timeline, UserTimelineEvent{
			ID:    fmt.Sprintf("milestone-%d", m.ID),
			Year:  evYear,
			Title: title,
		})
	}

	if len(timeline) == 0 {
		evYear := "2024"
		if user.CreatedAt.Valid && user.CreatedAt.Time.Year() > 2000 {
			evYear = strconv.Itoa(user.CreatedAt.Time.Year())
		}
		evTitle := "Joined Free9ja"
		if party != nil {
			evTitle = fmt.Sprintf("Joined %s", party.ShortName)
		}

		var branches []UserTimelineBranch
		for i, c := range user.Candidacies {
			branches = append(branches, UserTimelineBranch{
				ID:    fmt.Sprintf("cand-%d", c.ID),
				Title: fmt.Sprintf("Contested %s", c.OfficeName),
			})
			if i >= 2 {
				break
			}
		}

		timeline = append(timeline, UserTimelineEvent{
			ID:       "join-event",
			Year:     evYear,
			Title:    evTitle,
			Branches: branches,
		})
	}

	fullName := strings.TrimSpace(user.FirstName.String + " " + user.LastName.String)
	if fullName == "" {
		fullName = cleanUsername
	}

	location := ""
	if user.CityName != "" && user.StateName != "" {
		location = fmt.Sprintf("%s, %s", user.CityName, user.StateName)
	} else if user.StateName != "" {
		location = user.StateName
	}

	return &UserPublicProfile{
		ID:             user.ID,
		FakeID:         user.FakeID.Int64,
		Username:       cleanUsername,
		Name:           fullName,
		FirstName:      user.FirstName.String,
		LastName:       user.LastName.String,
		Avatar:         user.Avatar.String,
		Party:          party,
		Role:           role,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		IsFollowing:    isFollowing,
		IsPolitician:   user.IsPolitician.Bool,
		IsVerified:     user.IsVerified.Bool,
		Location:       location,
		Timeline:       timeline,
	}, nil
}
