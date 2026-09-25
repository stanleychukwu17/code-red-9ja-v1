import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  resolveProfile,
  ProfileCard,
  ProfileFloatingToolbar,
} from "#/components/profile/profile-page";
import { ProfileNavTabs } from "#/components/profile/ProfileNavTabs";

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) =>
    getPageHeader({
      title: `${params.username ? `${params.username} Profile` : "Profile"} `,
      description: `View profile and political history for ${params.username || "Chukwu Stanley"} on Free9ja.`,
    }),
  component: ProfileLayoutComponent,
});

function ProfileLayoutComponent() {
  const { username } = Route.useParams();
  const profile = resolveProfile(username);

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-2 md:px-8 lg:px-8 py-8">
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

