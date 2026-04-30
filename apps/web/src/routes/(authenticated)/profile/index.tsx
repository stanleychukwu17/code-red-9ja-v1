import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { AppSidebarShell } from "../../../components/app-sidebar";
import { FEED_POSTS } from "../../../data/dashboard";
import {
  PROFILE_CANDIDATE,
  PROFILE_USER,
  type ProfileData,
  type ProfileTabId,
} from "../../../data/profile";
import { cn } from "node_modules/@repo/ui/src/lib/utils";

export const Route = createFileRoute("/(authenticated)/profile/")({
  validateSearch: (search) => ({
    type: search.type === "candidate" ? "candidate" : "user",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { type } = Route.useSearch();
  const profile = type === "candidate" ? PROFILE_CANDIDATE : PROFILE_USER;
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

  return (
    <AppSidebarShell activeItem="profile">
      <div className="flex-1 px-4 pb-10 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124]">
            My Profile
          </h1>

          <section className="space-y-4">
            <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-5">
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="size-[84px] rounded-full object-cover"
                />
                {profile.verified ? (
                  <span className="absolute -bottom-1 -right-1 inline-flex size-9 items-center justify-center rounded-full bg-[#d7d6d8]">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#c7c6c8]">
                      <span className="text-[12px] font-bold text-[#1b1b1b]">
                        V
                      </span>
                    </span>
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 space-y-2 pt-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-[20px] font-semibold text-[#141214]">
                      {profile.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
                          profile.badge.variant === "purple"
                            ? "bg-[#ead8f7] text-[#6a40d7]"
                            : "bg-[#def1e6] text-[#2f6f57]",
                        )}
                      >
                        {profile.badge.label}
                      </span>
                      {profile.party ? (
                        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#1b1b1b]">
                          <span className="inline-flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
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
                          <p className="text-[16px] font-semibold text-[#1b1b1b]">
                            {m.value}
                          </p>
                          <p className="text-[12px] text-[#8b8589]">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#8b8589]">
                  {profile.locationLine ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7]" />
                      {profile.locationLine}
                    </span>
                  ) : null}
                  <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7]" />
                  <span>FCT, Nigeria</span>
                  {profile.joinedLine ? (
                    <>
                      <span className="inline-block size-1.5 rounded-full bg-[#c8c4c7]" />
                      <span>{profile.joinedLine}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {profile.bio ? (
              <p className="text-[14px] text-[#232124]">
                {profile.bio}{" "}
                <span className="text-[#a29da1]" aria-hidden>
                  ✌️
                </span>
              </p>
            ) : null}

            {profile.highlightPill ? (
              <div className="rounded-[12px] bg-[#ead8f7] px-4 py-3 text-[12px] font-semibold text-[#6a40d7]">
                <span className="inline-flex items-center gap-2">
                  <Star className="size-4" />
                  <span>{profile.highlightPill.left}</span>
                  <span className="ml-2 text-[#6a40d7] underline">
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
                  className="border-b border-black/5 pb-6"
                >
                  <div className="flex gap-4">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="size-[38px] rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-[14px] font-semibold text-[#151314]">
                          {profile.name}
                        </span>
                        <span className="text-[12px] text-[#8b8589]">
                          {post!.meta}
                        </span>
                      </div>

                      <p className="text-[14px] leading-7 text-[#202021]">
                        {post!.content}
                      </p>

                      {post!.image ? (
                        <img
                          src={post!.image}
                          alt={profile.name}
                          className="h-[230px] w-full rounded-[12px] object-cover"
                        />
                      ) : null}

                      <div className="flex items-center gap-8">
                        <Reaction
                          icon={<Heart className="size-5 text-[#7b7679]" />}
                          value={post!.likes}
                        />
                        <Reaction
                          icon={
                            <MessageCircle className="size-5 text-[#7b7679]" />
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
                <p className="text-[13px] leading-7 text-[#3a3438]">
                  {profile.about.text}
                </p>
              ) : null}

              <div className="space-y-7">
                {profile.about?.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[minmax(0,1fr)_140px] gap-6 border-t border-black/5 pt-6"
                  >
                    <div className="space-y-2">
                      <p className="text-[12px] text-[#a29da1]">{row.label}</p>
                      <p className="text-[13px] text-[#141214]">{row.value}</p>
                    </div>
                    <div className="text-right text-[12px] text-[#141214]">
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
                  className="grid h-14 w-full grid-cols-[minmax(0,1fr)_140px_52px] items-center gap-4 text-left"
                >
                  <span className="text-[14px] text-[#1d1d1d]">
                    {row.state}
                  </span>
                  <span className="text-right text-[12px] font-semibold text-black/80">
                    {row.votes}
                  </span>
                  <span className="text-right text-[12px] font-semibold text-black/40">
                    {row.rank}
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          {activeTab === "campaign" ? (
            <section className="space-y-6 pt-2">
              <div className="space-y-2">
                <p className="text-[12px] text-[#a29da1]">Slogan</p>
                <p className="text-[13px] text-[#141214]">
                  {profile.campaign?.slogan ?? ""}
                </p>
              </div>

              <div className="space-y-4">
                {profile.campaign?.planks.map((plank) => (
                  <details
                    key={plank.title}
                    className="group rounded-[12px] px-5 py-4"
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

          <div className="pt-4">
            <button
              type="button"
              className="text-[12px] text-[#8b8589] underline"
              onClick={() =>
                navigate({
                  to: "/profile",
                  search: { type: type === "candidate" ? "user" : "candidate" },
                  replace: true,
                })
              }
            >
              Switch to {type === "candidate" ? "user" : "candidate"} preview
            </button>
          </div>
        </div>
      </div>
    </AppSidebarShell>
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
    <div className="relative border-b border-black/5">
      <div className="flex items-end justify-center gap-12 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative pb-4 text-[13px] font-semibold transition",
                isActive ? "text-[#151314]" : "text-[#a4a0a2]",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute left-1/2 -bottom-[1px] h-0.5 w-28 -translate-x-1/2 rounded-full transition-opacity",
                  isActive ? "bg-[#151314] opacity-100" : "opacity-0",
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
      <span className="text-[12px] font-medium text-[#151314]">{value}</span>
    </div>
  );
}
