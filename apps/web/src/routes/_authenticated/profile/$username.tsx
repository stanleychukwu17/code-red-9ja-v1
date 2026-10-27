import { createFileRoute, Outlet } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPageHeader } from "#/lib/shared/meta";
import { DEFAULT_USER_PROFILE, ProfileCard, ProfileFloatingToolbar, type UserProfileData } from "#/components/profile/profile-page";
import { ProfileNavTabs } from "#/components/profile/ProfileNavTabs";
import { getUserProfile } from "@/lib/server/citizens";
import { formatNumber } from "@repo/ui/lib/number";

export const userProfileQueryOptions = (username: string) => queryOptions({
  queryKey: ["userProfile", username.replace(/^@/, "")],
  queryFn: () => getUserProfile({
    data: { username: username.replace(/^@/, "") },
  }),
  staleTime: Infinity,
  gcTime: Infinity,
});

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) => getPageHeader({
    title: `${params.username ? `${params.username} Profile` : "Profile"} `,
    description: `View profile and political history for ${params.username || "Chukwu Stanley"} on Free9ja.`,
  }),

  errorComponent: ({ error }) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <div className="rounded-lg bg-destructive/10 p-6 text-destructive">
        <h2 className="text-lg font-semibold">Error Loading User Profile</h2>
        <p className="mt-2 text-sm">{error?.message || "Failed to load user profile"}</p>
      </div>
    </div>
  ),
  component: ProfileLayoutComponent,
});



function ProfileLayoutComponent() {
  const { username } = Route.useParams();
  const { data: profileRes, error } = useQuery(userProfileQueryOptions(username));

  if (error) {
    throw error;
  }

  if (profileRes && !profileRes.success) {
    throw new Error(profileRes.message || "Failed to load user profile");
  }

  const raw = profileRes?.data;
  const profile: UserProfileData = raw
    ? {
      username: raw.username,
      name: raw.name || raw.username,
      avatar: raw.avatar || "",
      party: raw.party
        ? {
          name: raw.party.short_name || raw.party.name,
          since: raw.party.since || "",
          color: raw.party.color || "#0066da",
        }
        : {
          name: "Independent",
          since: "Citizen",
          color: "#6b7280",
        },
      role: raw.role
        ? {
          title: raw.role.title,
          chapter: raw.role.chapter,
        }
        : {
          title: "Citizen",
          chapter: raw.location || "Nigeria",
        },
      followersCount: formatNumber(raw.followers_count ?? 0),
      followingCount: formatNumber(raw.following_count ?? 0),
      timeline: (raw.timeline || []).map((t) => ({
        id: t.id,
        year: t.year,
        title: t.title,
        branches: t.branches,
      })),
    }
    : DEFAULT_USER_PROFILE;

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-2 md:px-8 py-0 lg:py-8">
      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-10 lg:gap-16 items-start">

        {/* Left Column: Profile Card & Floating Tools */}
        <div className="flex flex-col items-center">
          <ProfileCard profile={profile} />
          <ProfileFloatingToolbar />
        </div>

        {/* Right Column: Navigation Tabs & Tab Route Outlet */}
        <div className="flex flex-col gap-6 pt-2 min-w-0">
          <ProfileNavTabs username={username} />

          <main className="w-full">
            <Outlet />
          </main>
        </div>

      </div>
    </div>
  );
}
