import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Heart, MessageCircle, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { FEED_POSTS } from "../../../data/dashboard";
import {
  PROFILE_CANDIDATE,
  PROFILE_USER,
  type ProfileData,
  type ProfileTabId,
} from "../../../data/profile";
import { cn } from "@repo/ui/lib/utils";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/profile-old/$username")({
  head: ({ params }) =>
    getPageHeader({
      title: `${params.username ? `${params.username} Profile` : "Profile"} `,
      description: `View profile and civic activity for @${params.username} on Free9ja.`,
    }),
  component: ProfilePageComponent,
});

/**
 * Resolves profile mock data by username param or kind.
 */
function resolveProfile(username?: string): ProfileData {
  if (!username) return PROFILE_USER;
  const normalized = username.toLowerCase();
  if (
    normalized === "atiku" ||
    normalized === "atiku_abubakar" ||
    normalized === "atiku-abubakar" ||
    normalized === "candidate"
  ) {
    return PROFILE_CANDIDATE;
  }
  return PROFILE_USER;
}

export function ProfilePageComponent() {
  const params = useParams({ strict: false }) as { username?: string };
  const username = params.username;

  const profile = resolveProfile(username);
  const tabs = getTabs(profile.kind);
  const [activeTab, setActiveTab] = useState<ProfileTabId>(tabs[0]!.id);
  const navigate = useNavigate();

  const posts = useMemo(() => {
    const byId = new Map(FEED_POSTS.map((p) => [p.id, p]));
    return profile.feedPostIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 12);
  }, [profile.feedPostIds]);

  const isCandidate = profile.kind === "candidate";

  return (
    <div className="flex-1 px-4 pb-10 pt-6 md:px-12 md:pt-7">
      <div className="mx-auto flex w-full max-w-155 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124] dark:text-neutral-100">
            {profile.name}
          </h1>
          {username ? (
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              @{username}
            </span>
          ) : null}
        </div>

        <section className="space-y-4">
          <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-5">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="size-[84px] rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10"
              />
              {profile.verified ? (
                <span className="absolute -bottom-1 -right-1 inline-flex size-9 items-center justify-center rounded-full bg-[#d7d6d8] dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#c7c6c8] dark:bg-neutral-700">
                    <span className="text-[12px] font-bold text-[#1b1b1b] dark:text-neutral-100">
                      V
                    </span>
                  </span>
                </span>
              ) : null}
            </div>

            <div className="min-w-0 space-y-2 pt-1">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[20px] font-semibold text-[#141214] dark:text-neutral-100">
                    {profile.name}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
                        profile.badge.variant === "purple"
                          ? "bg-[#ead8f7] text-[#6a40d7] dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-[#def1e6] text-[#2f6f57] dark:bg-emerald-950/60 dark:text-emerald-300",
                      )}
                    >
                      {profile.badge.label}
                    </span>
                    {profile.party ? (
                      <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#1b1b1b] dark:text-neutral-200">
                        <span className="inline-flex size-4 items-center justify-center rounded-full bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/20">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: profile.party.color }}
                          />
                        </span>
                        {profile.party.label}
                      </span>
                    ) : null}
                  </div>
                </div>

                {profile.metrics?.length ? (
                  <div className="grid grid-cols-2 gap-10 pt-1 md:pt-0">
                    {profile.metrics.map((m) => (
                      <div key={m.label} className="text-left">
                        <p className="text-[16px] font-semibold text-[#1b1b1b] dark:text-neutral-100">
                          {m.value}
                        </p>
                        <p className="text-[12px] text-[#8b8589] dark:text-neutral-400">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#8b8589] dark:text-neutral-400">
                {profile.locationLine ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7] dark:bg-neutral-600" />
                    {profile.locationLine}
                  </span>
                ) : null}
                <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7] dark:bg-neutral-600" />
                <span>FCT, Nigeria</span>
                {profile.joinedLine ? (
                  <>
                    <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7] dark:bg-neutral-600" />
                    <span>{profile.joinedLine}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {profile.bio ? (
            <p className="text-[14px] text-[#232124] dark:text-neutral-200">
              {profile.bio}{" "}
              <span className="text-[#a29da1]" aria-hidden>
                ✌️
              </span>
            </p>
          ) : null}

          {profile.highlightPill ? (
            <div className="rounded-12 bg-[#ead8f7] dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/50 px-4 py-3 text-[12px] font-semibold text-[#6a40d7] dark:text-purple-300">
              <span className="inline-flex items-center gap-2">
                <Star className="size-4" />
                <span>{profile.highlightPill.left}</span>
                <span className="ml-2 text-[#6a40d7] dark:text-purple-300 underline">
                  {profile.highlightPill.right}
                </span>
              </span>
            </div>
          ) : null}
        </section>

        <ProfileTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "feed" ? (
          <section className="space-y-6 pt-2">
            {posts.map((post) => (
              <article
                key={post!.id}
                className="border-b border-black/5 dark:border-white/10 pb-6"
              >
                <div className="flex gap-4">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="size-[38px] rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[14px] font-semibold text-[#151314] dark:text-neutral-100">
                        {profile.name}
                      </span>
                      <span className="text-[12px] text-[#8b8589] dark:text-neutral-400">
                        {post!.meta}
                      </span>
                    </div>

                    <p className="text-[14px] leading-7 text-[#202021] dark:text-neutral-200">
                      {post!.content}
                    </p>

                    {post!.image ? (
                      <img
                        src={post!.image}
                        alt={profile.name}
                        className="h-[230px] w-full rounded-12 object-cover"
                      />
                    ) : null}

                    <div className="flex items-center gap-8">
                      <Reaction
                        icon={<Heart className="size-5 text-[#7b7679] dark:text-neutral-400" />}
                        value={post!.likes}
                      />
                      <Reaction
                        icon={
                          <MessageCircle className="size-5 text-[#7b7679] dark:text-neutral-400" />
                        }
                        value={post!.comments}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "about" ? (
          <section className="space-y-6 pt-2">
            {profile.about?.text ? (
              <p className="text-[13px] leading-7 text-[#3a3438] dark:text-neutral-300">
                {profile.about.text}
              </p>
            ) : null}

            <div className="space-y-7">
              {profile.about?.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(0,1fr)_140px] gap-6 border-t border-black/5 dark:border-white/10 pt-6"
                >
                  <div className="space-y-2">
                    <p className="text-[12px] text-[#a29da1] dark:text-neutral-400">
                      {row.label}
                    </p>
                    <p className="text-[13px] text-[#141214] dark:text-neutral-100">
                      {row.value}
                    </p>
                  </div>
                  <div className="text-right text-[12px] text-[#141214] dark:text-neutral-100">
                    {row.right ?? ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "votes" ? (
          <section className="space-y-2 pt-2">
            {profile.votes?.map((row) => (
              <div
                key={row.state}
                className="grid h-14 w-full grid-cols-[minmax(0,1fr)_140px_52px] items-center gap-4 text-left border-b border-black/5 dark:border-white/5 last:border-none"
              >
                <span className="text-[14px] text-[#1d1d1d] dark:text-neutral-100">
                  {row.state}
                </span>
                <span className="text-right text-[12px] font-semibold text-black/80 dark:text-neutral-200">
                  {row.votes}
                </span>
                <span className="text-right text-[12px] font-semibold text-black/40 dark:text-neutral-500">
                  {row.rank}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {activeTab === "campaign" ? (
          <section className="space-y-6 pt-2">
            <div className="space-y-2">
              <p className="text-[12px] text-[#a29da1] dark:text-neutral-400">Slogan</p>
              <p className="text-[13px] text-[#141214] dark:text-neutral-100">
                {profile.campaign?.slogan ?? ""}
              </p>
            </div>

            <div className="space-y-4">
              {profile.campaign?.planks.map((plank) => (
                <details
                  key={plank.title}
                  className="group rounded-12 px-5 py-4 dark:bg-neutral-800/70 border border-black/5 dark:border-white/5"
                  open={false}
                  style={{
                    background:
                      plank.title ===
                        "Restructuring Nigeria / True Federalism"
                        ? "#dfe9e2"
                        : plank.title === "Economic Growth"
                          ? "#f6e8c6"
                          : plank.title ===
                            "Job Creation and Poverty Reduction"
                            ? "#ead8f7"
                            : "#f2c9c9",
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-[#141214]">
                    <span>{plank.title}</span>
                    <span className="text-[#6f6a6e] transition group-open:rotate-180">
                      ˅
                    </span>
                  </summary>
                  <p className="mt-3 text-[13px] leading-7 text-[#3a3438]">
                    {plank.body}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* Dynamic preview switcher for testing profile/username */}
        <div className="pt-4">
          <button
            type="button"
            className="text-[12px] text-[#8b8589] dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer"
            onClick={() => {
              const targetUser = isCandidate ? "lotta_chukwuka" : "atiku";
              navigate({
                to: `/profile-old/${targetUser}`,
              });
            }}
          >
            Switch to {isCandidate ? "user (lotta_chukwuka)" : "candidate (atiku)"} preview
          </button>
        </div>
      </div>
    </div>
  );
}

function getTabs(kind: ProfileData["kind"]): Array<{
  id: ProfileTabId;
  label: string;
}> {
  if (kind === "candidate") {
    return [
      { id: "feed", label: "Feed" },
      { id: "votes", label: "Votes" },
      { id: "campaign", label: "Campaign" },
      { id: "about", label: "About" },
    ];
  }

  return [
    { id: "feed", label: "Feed" },
    { id: "about", label: "About" },
  ];
}

function ProfileTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: ProfileTabId; label: string }>;
  active: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
}) {
  return (
    <div className="relative border-b border-black/5 dark:border-white/10">
      <div className="flex items-end justify-center gap-12 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative pb-4 text-[13px] font-semibold transition cursor-pointer",
                isActive
                  ? "text-[#151314] dark:text-neutral-100"
                  : "text-[#a4a0a2] dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute left-1/2 -bottom-[1px] h-0.5 w-28 -translate-x-1/2 rounded-full transition-opacity",
                  isActive
                    ? "bg-[#151314] dark:bg-neutral-100 opacity-100"
                    : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Reaction({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[12px] font-medium text-[#151314] dark:text-neutral-200">
        {value}
      </span>
    </div>
  );
}
