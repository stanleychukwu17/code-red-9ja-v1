import { getAllCountries, getStates } from "#/lib/server/countries";
import { getPageHeader } from "#/lib/shared/meta";
import { AppAvatar, Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  LeaderboardCardRow,
  LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import {
  DashboardLayout,
  HeaderTabs,
  StatCard,
  StatSection,
} from "@repo/ui/components/custom/AdminLayouts";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileImage,
  Layers,
  MapPin,
  Play,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import * as React from "react";
import { HomePageHeader } from "./header";
import BallotIcon from "@repo/ui/icons/ballot-icon";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import ReportCubeIcon from "@repo/ui/icons/report-cube-icon";

function GalleryItem({
  imageSrc,
  avatarSrc,
  title,
  subtitle,
  time,
  showReportIcon,
}: {
  imageSrc: string;
  avatarSrc: string;
  title: string;
  subtitle: string;
  time: string;
  showReportIcon?: boolean;
}) {
  return (
    <div className="space-y-2.5 cursor-pointer group">
      {/* Image container */}
      <div className="relative aspect-[2.1/3] w-full rounded-2xl overflow-hidden shadow-xs border border-c-10 bg-border">
        <img
          src={imageSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs">
          {time}
        </div> */}
        <p className="absolute bottom-3 right-3 text-sm font-bold text-white [text-shadow:_0_0px_8px_rgb(0_0_0_/_0.9)]">
          {time}
        </p>
      </div>

      {/* Details sub-row */}
      <div className="flex gap-2 items-start px-0.5">
        <Avatar className="size-8 border border-white shadow-xs shrink-0">
          <AvatarImage src={avatarSrc} alt={title} />
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs text-c-90 truncate leading-tight">
            {title}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[11px] text-c-50 truncate leading-none">
              {subtitle}
            </span>
            {showReportIcon && (
              <ReportCubeIcon className="size-4 rounded-[2px] shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryRow({
  title,
  count,
  imageSrc,
  showReportIcon,
}: {
  title: string;
  count: string;
  imageSrc: string;
  showReportIcon?: boolean;
}) {
  const items = [
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop",
    },
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
    },
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop",
    },
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=50&h=50&fit=crop",
    },
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop",
    },
    {
      title: "T/MADO / PRIMA...",
      subtitle: "Bwari LGA",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=50&h=50&fit=crop",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-xl font-semibold text-c-90 flex items-center gap-1.5">
          {showReportIcon && <ReportCubeIcon className="size-7" />}
          {title} <span className="text-c-40 font-normal">({count})</span>
        </h2>
        <button className="text-c-60 hover:text-c-80 hover:underline transition duration-200 cursor-pointer">
          See all
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {items.map((item, index) => (
          <GalleryItem
            key={index}
            imageSrc={imageSrc}
            avatarSrc={item.avatar}
            title={item.title}
            subtitle={item.subtitle}
            time="5:43 PM"
            showReportIcon={showReportIcon}
          />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/election-day",
)({
  head: () => getPageHeader({ title: "Election Day Dashboard" }),
  component: ElectionDayComponent,
});

function ElectionDayComponent() {
  const [filterView, setFilterView] = React.useState<
    "final" | "fillings" | "counted"
  >("final");
  const [activityTab, setActivityTab] = React.useState<
    "all" | "updates" | "reports"
  >("all");

  const [selectedCountryId, setSelectedCountryId] = React.useState<
    number | undefined
  >(161);
  const [selectedStateId, setSelectedStateId] = React.useState<
    number | undefined
  >();

  const fetchCountriesFn = useServerFn(getAllCountries);
  const fetchStatesFn = useServerFn(getStates);

  const candidates = [
    {
      rank: 1,
      name: "Atiku Abubakar",
      party: "ADC",
      states: "3 states",
      votes: "4.9m votes",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    },
    {
      rank: 2,
      name: "Peter Obi",
      party: "NDC",
      states: "11 states",
      votes: "4.9m votes",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    {
      rank: 3,
      name: "Bola Tinubu",
      party: "APC",
      states: "1 state",
      votes: "4.9m votes",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    },
  ];

  const activities = [
    {
      name: "Lottanna Chukwuka",
      text: "Everything is going fine over here and voting is taking place smoothly.",
      time: "5:34 PM",
      meta: "1 video",
      type: "updates",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    {
      name: "Ibrahim Musa",
      text: "For some reason we are out of ballot papers, this makes absolutely no sense",
      time: "5:34 PM",
      meta: "1 video",
      badge: "Result falsification",
      type: "reports",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    {
      name: "John Isa",
      text: "A free and fair election is still ongoing.",
      time: "5:34 PM",
      meta: "1 picture",
      type: "updates",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    },
  ];

  const filteredActivities = activities.filter(
    (a) => activityTab === "all" || a.type === activityTab,
  );

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="election-day" />

      {/* Filter and Switcher Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Country Selection */}
          <div className="w-[180px]">
            <SelectCountry
              selectedId={selectedCountryId}
              update={(country) => {
                setSelectedCountryId(country?.id);
                setSelectedStateId(undefined);
              }}
              fetchCountries={fetchCountriesFn}
              className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              disabled
            />
          </div>

          {/* State Selection */}
          <div className="w-[180px]">
            <SelectState
              selectedId={selectedStateId}
              update={(state) => setSelectedStateId(state?.id)}
              fetchStates={fetchStatesFn}
              countryOriginalId={selectedCountryId}
              disabled={!selectedCountryId}
              className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
            />
          </div>
        </div>

        {/* View Switcher (Final, Fillings, Counted) */}
        <div className="flex bg-[#f3f4f6] p-1 rounded-xl w-fit gap-1 select-none">
          {(["final", "fillings", "counted"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setFilterView(view)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all",
                filterView === view
                  ? "bg-[#222] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr] items-start">
        {/* Left Hand Column */}
        <div className="space-y-6">
          {/* Leaderboard Card */}
          <LeaderboardCardWrapper>
            {candidates.map((candidate) => (
              <LeaderboardCardRow
                key={candidate.rank}
                rank={candidate.rank}
                avatarUrl={candidate.avatar}
                name={candidate.name}
                partyShortName={candidate.party}
                statesWinningCount={candidate.states}
                votesCount={candidate.votes}
              />
            ))}
            <div className="px-6 w-full my-2">
              <Button
                variant="black"
                size="2xl"
                className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
              >
                See all
              </Button>
            </div>
          </LeaderboardCardWrapper>

          {/* Activities Stream */}
          <div className="border border-border rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight">
                Activities
              </h2>

              {/* Activity filter pills */}
              <HeaderTabs
                activeTab={activityTab}
                tabs={[
                  {
                    id: "all",
                    label: "All",
                    onClick: () => setActivityTab("all"),
                  },
                  {
                    id: "updates",
                    label: "Updates",
                    onClick: () => setActivityTab("updates"),
                  },
                  {
                    id: "reports",
                    label: "Reports",
                    onClick: () => setActivityTab("reports"),
                  },
                ]}
                activeTabClassName="bg-[#222] text-white shadow-sm"
                containerClassName="h-10"
              />
            </div>

            <div>
              {filteredActivities.map((act) => (
                <div key={act.name} className="flex gap-4 py-4">
                  <AppAvatar
                    src={act.avatar}
                    alt={act.name}
                    className="size-10 shrink-0"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-c-90 text-sm ">
                        {act.name} 🎙️
                        <span className="text-sm text-c-70 font-normal">
                          {" "}
                          {act.text}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-c-50">
                      <span>{act.time}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {/* {act.meta.includes("video") ? (
                          <Video className="size-3" />
                        ) : (
                          <FileImage className="size-3" />
                        )} */}
                        {act.meta}
                      </span>
                      {act.badge && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-red">
                            <AlertTriangle className="size-2.5" />
                            {act.badge}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">
                  No activity logs found for this filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Hand Column */}
        <div className="space-y-6">
          {/* Polling Units Stats */}
          <StatSection title="Polling Units">
            <StatCard
              label="Total Units"
              value="144,038"
              icon={<BallotIcon className="size-5" />}
            />
            <StatCard
              label="Election started in"
              value="65%"
              icon={<BallotIcon className="size-5" />}
            />
            <StatCard
              label="PU Counted Votes"
              value="14%"
              icon={<BallotIcon className="size-5" />}
            />
            <StatCard
              label="Agent Live PU Result"
              value="20%"
              icon={<BallotIcon className="size-5" />}
            />
          </StatSection>

          {/* Reports Stats */}
          <StatSection title="Reports">
            <StatCard
              label="Total Reports"
              value="3.2k"
              icon={<ReportCubeIcon className="size-5" />}
            />
            <StatCard
              label="Reported PU"
              value={
                <span className="flex items-center gap-1">
                  3% <span className="text-c-50 font-normal">(592)</span>
                </span>
              }
              icon={<ReportCubeIcon className="size-5" />}
            />
          </StatSection>

          {/* Polling Agents Stats */}
          <StatSection title="Polling Agents">
            <StatCard
              label="Total Agents"
              value="66.3k"
              icon={<FancyAgentIcon className="size-5" />}
            />
            <StatCard
              label="Total Agent Updates"
              value="112.6k"
              icon={<FancyAgentIcon className="size-5" />}
            />
            <StatCard
              label="Online Agents"
              value={
                <span className="flex items-center gap-1">
                  48%{" "}
                  <span className="text-sm text-c-50 font-normal">(31.5k)</span>
                </span>
              }
              icon={<FancyAgentIcon className="size-5" />}
            />
            <StatCard
              label="Agents at Post"
              value="80%"
              icon={<FancyAgentIcon className="size-5" />}
            />
          </StatSection>
        </div>
      </div>

      {/* Stacked Bottom Sections */}
      <div className="space-y-10 pt-5 pb-24">
        <GalleryRow
          title="Final Results"
          count="48"
          imageSrc="/nigerian_result_sheet_mockup.png"
        />
        <GalleryRow
          title="Agent Updates"
          count="11,893"
          imageSrc="/nigerian_polling_unit_booth.png"
        />
        <GalleryRow
          title="Reports"
          count="592"
          imageSrc="/nigerian_polling_unit_booth.png"
          showReportIcon
        />
      </div>
    </DashboardLayout>
  );
}
