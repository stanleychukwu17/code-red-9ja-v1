import { Button } from "@repo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import {
  Flag,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Siren,
  Upload,
} from "lucide-react";
import { useState } from "react";
import ReportIcon from "@repo/ui/icons/report-icon";
import { AppPageHeader } from "../../../components/app-page-header";
import { AppSidebarShell } from "../../../components/app-sidebar";
import {
  POLLING_UNIT_ACTIVITIES,
  POLLING_UNIT_FEED_POSTS,
  POLLING_UNIT_INEC_UPLOAD,
  POLLING_UNIT_REPORT_POSTS,
  POLLING_UNIT_SITUATION_POSTS,
  POLLING_UNIT_VOTER_UPLOADS,
  POLLING_UNIT_VOTE_ROWS,
} from "../../../data/dashboard";

type TopTab = "Feed" | "Votes" | "Activities";
type VoteTab = "Main" | "From voters" | "From INEC";
type FeedFilter = "All" | "Reports" | "Situation Report";

export const Route = createFileRoute(
  "/(authenticated)/polling-unit/$pollingUnitId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const [topTab, setTopTab] = useState<TopTab>("Feed");
  const [voteTab, setVoteTab] = useState<VoteTab>("Main");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("All");
  const { pollingUnitId } = Route.useParams();

  const feedPosts =
    feedFilter === "All"
      ? [
          ...POLLING_UNIT_FEED_POSTS,
          ...POLLING_UNIT_REPORT_POSTS,
          ...POLLING_UNIT_SITUATION_POSTS,
        ]
      : feedFilter === "Reports"
        ? POLLING_UNIT_REPORT_POSTS
        : POLLING_UNIT_SITUATION_POSTS;

  const leader = POLLING_UNIT_VOTE_ROWS[2];

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
          <AppPageHeader
            title="Candidates"
            right={
              <div className="relative hidden md:block">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="size-[92px] rounded-full object-cover"
                />
                <div className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full bg-[#d5e2da] text-[16px] font-bold text-black">
                  #1
                </div>
              </div>
            }
          />

          <section className="space-y-5">
            <div className="space-y-3">
              <p className="text-[18px] text-[#837d82]">Polling unit</p>
              <h2 className="text-[52px] font-bold leading-none tracking-[-0.05em] text-[#2f6f57]">
                {pollingUnitId}
              </h2>
            </div>

            <div className="flex items-center gap-6 text-[#1d1b1e]">
              <Metric value="302" label="Votes" />
              <MetricDivider />
              <Metric value="2" label="Agents" />
              <MetricDivider />
              <Metric value="3" label="Reports" />
            </div>

            <div className="flex h-[48px] w-full max-w-[380px] items-center justify-between rounded-[12px] bg-[#ffe29a] px-4">
              <div className="flex items-center gap-3">
                <Flag className="size-4 fill-[#b06d12] text-[#b06d12]" />
                <span className="text-[16px] text-[#1b1a1b]">
                  This polling unit has been
                </span>
              </div>
              <span className="text-[16px] font-bold text-[#b06d12]">
                Flagged
              </span>
            </div>

            <div className="grid gap-4 md:max-w-[780px] md:grid-cols-2">
              <Button
                variant="purple"
                className="h-[62px] rounded-[18px] bg-[#6f53ef] text-[18px] font-semibold text-white hover:bg-[#6649ea]"
                icon={<Upload className="size-5 text-white/90" />}
              >
                Upload Vote Result
              </Button>

              <button
                type="button"
                className="flex h-[62px] items-center justify-center gap-3 rounded-[18px] border border-[#ff4b4b] bg-white text-[18px] font-semibold text-[#1d2c27] transition hover:bg-[#fff8f8]"
              >
                <ReportIcon className="size-5" />
                Report this polling unit
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <TopTabs value={topTab} onChange={setTopTab} />

            {topTab === "Feed" ? (
              <div className="space-y-5">
                <PillTabs
                  tabs={[
                    { key: "All", label: "All" },
                    { key: "Reports", label: "Reports 3" },
                    { key: "Situation Report", label: "Situation Report 4" },
                  ]}
                  value={feedFilter}
                  onChange={(value) => setFeedFilter(value as FeedFilter)}
                />

                {feedFilter === "All" ? (
                  <div className="flex items-center gap-4 border-b border-black/5 pb-5">
                    <img
                      src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg"
                      alt="What's happening"
                      className="size-11 rounded-full object-cover"
                    />
                    <span className="flex-1 text-[18px] text-[#696469]">
                      What&apos;s happening here
                    </span>
                    <ImageIcon className="size-7 text-[#8e898b]" />
                  </div>
                ) : feedFilter === "Situation Report" ? (
                  <div className="flex items-center gap-4 border-b border-black/5 pb-5">
                    <img
                      src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg"
                      alt="Give situation report"
                      className="size-11 rounded-full object-cover"
                    />
                    <span className="flex-1 text-[18px] text-[#6c66ff]">
                      Give situation report
                    </span>
                    <ImageIcon className="size-7 text-[#8e898b]" />
                  </div>
                ) : null}

                <div className="space-y-8">
                  {feedPosts.map((post) => (
                    <article key={post.id} className="flex gap-4">
                      <img
                        src={post.avatar}
                        alt={post.author}
                        className="mt-1 size-11 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-[16px] font-bold text-[#1c1a1b]">
                              <span
                                className={
                                  post.accent === "report"
                                    ? "text-[#ff3a3a]"
                                    : post.accent === "situation"
                                      ? "text-[#4b58ff]"
                                      : ""
                                }
                              >
                                {post.author}
                              </span>
                            </p>
                            <p className="max-w-[760px] text-[18px] leading-8 text-[#2b282b]">
                              {post.content}
                            </p>
                          </div>
                          <span className="text-[14px] text-[#8b8589]">
                            {post.meta}
                          </span>
                        </div>

                        {post.image ? (
                          <img
                            src={post.image}
                            alt={post.author}
                            className="h-[300px] w-full max-w-[650px] rounded-[18px] object-cover"
                          />
                        ) : null}

                        <div className="flex items-center gap-8 text-[#1c1a1b]">
                          <div className="flex items-center gap-2">
                            <Heart className="size-6 text-[#6f696e]" />
                            <span className="text-[16px] font-semibold">
                              {post.likes}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="size-6 text-[#6f696e]" />
                            <span className="text-[16px] font-semibold">
                              {post.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : topTab === "Votes" ? (
              <div className="space-y-6">
                <PillTabs
                  tabs={[
                    { key: "Main", label: "Main" },
                    { key: "From voters", label: "From voters 2" },
                    { key: "From INEC", label: "From INEC 1" },
                  ]}
                  value={voteTab}
                  onChange={(value) => setVoteTab(value as VoteTab)}
                />

                {voteTab === "Main" ? (
                  <div className="space-y-5">
                    {POLLING_UNIT_VOTE_ROWS.map((row) => (
                      <div
                        key={row.name}
                        className="grid grid-cols-[minmax(0,1fr)_120px_48px] items-center gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={row.image}
                            alt={row.name}
                            className="size-11 rounded-full object-cover"
                          />
                          <span className="text-[18px] text-[#1d1b1e]">
                            {row.name}
                          </span>
                        </div>
                        <span className="text-right text-[16px] font-semibold text-[#111111]">
                          {row.votes}
                        </span>
                        <span className="text-right text-[16px] font-semibold text-[#8d8d8d]">
                          {row.rank}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : voteTab === "From voters" ? (
                  <div className="space-y-9">
                    {POLLING_UNIT_VOTER_UPLOADS.map((upload) => (
                      <UploadCard key={upload.id} upload={upload} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 rounded-[12px] bg-[#ffe29a] px-4 py-4">
                      <Siren className="size-4 text-[#9a5b0f]" />
                      <p className="text-[16px] text-[#1f1a16]">
                        INEC upload does not match{" "}
                        <span className="font-bold">78%</span> of voters upload.
                      </p>
                    </div>
                    <UploadCard upload={POLLING_UNIT_INEC_UPLOAD} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {POLLING_UNIT_ACTIVITIES.map((row, index) => (
                  <div
                    key={`${row.actor}-${index}`}
                    className="flex items-start gap-4"
                  >
                    <img
                      src={row.image}
                      alt={row.actor}
                      className="size-11 rounded-full object-cover"
                    />
                    <div className="space-y-1">
                      <p className="text-[18px] leading-8 text-[#2a2729]">
                        <span
                          className={
                            row.accent === "info"
                              ? "font-medium text-[#5d6bff]"
                              : row.accent === "danger"
                                ? "font-medium text-[#ff4b4b]"
                                : "font-medium text-black/80"
                          }
                        >
                          {row.actor}
                        </span>{" "}
                        {row.action}
                      </p>
                      <p className="text-[14px] text-[#8b8589]">{row.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[24px] font-medium text-[#1c1a1b]">{value}</p>
      <p className="mt-1 text-[14px] text-[#7f7b7e]">{label}</p>
    </div>
  );
}

function MetricDivider() {
  return <div className="h-8 w-px bg-[#d8d2d5]" />;
}

function TopTabs({
  value,
  onChange,
}: {
  value: TopTab;
  onChange: (value: TopTab) => void;
}) {
  const tabs: TopTab[] = ["Feed", "Votes", "Activities"];

  return (
    <div className="flex border-b border-black/5">
      {tabs.map((tab) => {
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`flex-1 border-b-[3px] pb-4 pt-7 text-center text-[17px] font-bold transition ${
              active
                ? "border-black text-[#171416]"
                : "border-transparent text-[#b5b0b3]"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function PillTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ key: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-full px-5 py-4 text-[16px] font-bold transition ${
            value === tab.key
              ? "bg-[#e5e1e6] text-[#171416]"
              : "bg-transparent text-[#171416]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UploadCard({
  upload,
}: {
  upload: { author: string; timestamp: string; avatar: string; image: string };
}) {
  return (
    <article className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={upload.avatar}
            alt={upload.author}
            className="size-10 rounded-full object-cover"
          />
          <span className="text-[16px] font-bold text-[#171416]">
            {upload.author}
          </span>
        </div>
        <span className="text-[14px] text-[#8b8589]">{upload.timestamp}</span>
      </div>
      <img
        src={upload.image}
        alt={upload.author}
        className="max-h-[900px] w-full max-w-[710px] rounded-[4px] object-cover"
      />
    </article>
  );
}
