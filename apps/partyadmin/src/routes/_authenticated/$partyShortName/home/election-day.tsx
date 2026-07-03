import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import {
  ChevronDown,
  CheckCircle,
  FileText,
  Users,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Play,
  FileImage,
  Video,
  Eye,
  Activity,
  Layers,
  Map
} from "lucide-react";
import { getPageHeader } from "#/lib/shared/meta";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import { HomePageHeader } from "./header";

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
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-xs border border-gray-100 bg-[#f9fafb]">
        <img
          src={imageSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs">
          {time}
        </div>
      </div>
      
      {/* Details sub-row */}
      <div className="flex gap-2 items-start px-0.5">
        <Avatar className="size-8 border border-white shadow-xs shrink-0">
          <AvatarImage src={avatarSrc} alt={title} />
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs text-gray-900 truncate leading-tight">{title}</p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-gray-500 truncate leading-none">{subtitle}</span>
            {showReportIcon && (
              <span className="size-2 bg-[#ef4444] rounded-[2px] shrink-0" />
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
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" },
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" },
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop" },
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=50&h=50&fit=crop" },
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop" },
    { title: "T/MADO / PRIMA...", subtitle: "Bwari LGA", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=50&h=50&fit=crop" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h2 className="text-md font-bold text-gray-900 flex items-center gap-1.5">
          {showReportIcon && <span className="size-2.5 bg-[#ef4444] rounded-[3px] inline-block shrink-0" />}
          {title} <span className="text-gray-400 font-normal">({count})</span>
        </h2>
        <button className="text-xs font-bold text-gray-500 hover:text-gray-900 transition">See all</button>
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
  const [filterView, setFilterView] = React.useState<"final" | "fillings" | "counted">("final");
  const [activityTab, setActivityTab] = React.useState<"all" | "updates" | "reports">("all");

  const candidates = [
    {
      rank: 1,
      name: "Atiku Abubakar",
      party: "ADC",
      states: "3 states",
      votes: "4.9m votes",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
    },
    {
      rank: 2,
      name: "Peter Obi",
      party: "NDC",
      states: "11 states",
      votes: "4.9m votes",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
    },
    {
      rank: 3,
      name: "Bola Tinubu",
      party: "APC",
      states: "1 state",
      votes: "4.9m votes",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop"
    }
  ];

  const activities = [
    {
      name: "Lottanna Chukwuka",
      text: "Everything is going fine over here and voting is taking place smoothly.",
      time: "5:34 PM",
      meta: "1 video",
      type: "updates",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    },
    {
      name: "Ibrahim Musa",
      text: "For some reason we are out of ballot papers, this makes absolutely no sense",
      time: "5:34 PM",
      meta: "1 video",
      badge: "Result falsification",
      type: "reports",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
    },
    {
      name: "John Isa",
      text: "A free and fair election is still ongoing.",
      time: "5:34 PM",
      meta: "1 picture",
      type: "updates",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop"
    }
  ];

  const filteredActivities = activities.filter(
    (a) => activityTab === "all" || a.type === activityTab
  );

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="election-day" />

      {/* Filter and Switcher Row */}
      <div className="flex items-center justify-between gap-4 py-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Country Selection */}
          <button className="flex items-center gap-2 bg-[#f3f4f6] px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition">
            <span className="flex items-center justify-center size-5 rounded-full overflow-hidden text-xs bg-emerald-100">🇳🇬</span>
            <span>Nigeria</span>
            <ChevronDown className="size-4 text-gray-500" />
          </button>
          
          {/* State Selection */}
          <button className="flex items-center gap-2 bg-[#f3f4f6] px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition">
            <span>All states</span>
            <ChevronDown className="size-4 text-gray-500" />
          </button>
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
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr] pb-24 items-start">
        {/* Left Hand Column */}
        <div className="space-y-6">
          {/* Leaderboard Card */}
          <div className="bg-[#151515] text-white rounded-[24px] p-6 shadow-md">
            <div className="space-y-5">
              {candidates.map((candidate) => (
                <div key={candidate.rank} className="flex items-center justify-between border-b border-zinc-800 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-500 font-bold text-lg w-4">{candidate.rank}</span>
                    <Avatar className="size-10 ring-2 ring-zinc-700">
                      <AvatarImage src={candidate.avatar} alt={candidate.name} />
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white leading-tight">{candidate.name} <span className="text-zinc-500 font-normal">· {candidate.party}</span></h3>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-sm font-medium text-zinc-400">{candidate.states}</p>
                    <p className="font-bold text-white text-base">{candidate.votes}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full py-3 bg-[#2a2a2a] hover:bg-[#333] transition rounded-xl font-semibold text-sm text-center text-zinc-300">
              See all
            </button>
          </div>

          {/* Activities Stream */}
          <div className="bg-[#fafafa] border border-gray-100 rounded-[24px] p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight">Activities</h2>
              
              {/* Activity filter pills */}
              <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs font-semibold select-none">
                {(["all", "updates", "reports"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivityTab(tab)}
                    className={cn(
                      "px-3 py-1 rounded-md capitalize transition-all",
                      activityTab === tab
                        ? "bg-[#222] text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredActivities.map((act) => (
                <div key={act.name} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={act.avatar} alt={act.name} />
                  </Avatar>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{act.name}:</span>
                      <span className="text-sm text-gray-700 leading-normal">{act.text}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{act.time}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {act.meta.includes("video") ? <Video className="size-3" /> : <FileImage className="size-3" />}
                        {act.meta}
                      </span>
                      {act.badge && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 font-medium">
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
          <div className="bg-[#fafafa] border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Polling Units</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-blue-50 text-blue-600 rounded-lg">
                  <Layers className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Total Units</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">144,038</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-blue-50 text-blue-600 rounded-lg">
                  <Play className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Election started in</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">65%</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-blue-50 text-blue-600 rounded-lg">
                  <CheckCircle className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">PU Counted Votes</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">14%</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-blue-50 text-blue-600 rounded-lg">
                  <Activity className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Agent Live PU Result</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">20%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Stats */}
          <div className="bg-[#fafafa] border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Reports</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-red-50 text-red-600 rounded-lg">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Total Reports</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">3.2k</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-red-50 text-red-600 rounded-lg">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Reported PU</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">3% (592)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Polling Agents Stats */}
          <div className="bg-[#fafafa] border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Polling Agents</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-orange-50 text-orange-700 rounded-lg">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Total Agents</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">66.3k</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-orange-50 text-orange-700 rounded-lg">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Total Agent Updates</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">112.6k</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-orange-50 text-orange-700 rounded-lg">
                  <Eye className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Online Agents</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">48% (31.5k)</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-center size-8 bg-orange-50 text-orange-700 rounded-lg">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Agents at Post</p>
                  <p className="text-lg font-bold text-gray-800 tracking-tight">80%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Bottom Sections */}
      <div className="mt-12 space-y-10 pb-24">
        <GalleryRow title="Final Results" count="48" imageSrc="/nigerian_result_sheet_mockup.png" />
        <GalleryRow title="Agent Updates" count="11,893" imageSrc="/nigerian_polling_unit_booth.png" />
        <GalleryRow title="Reports" count="592" imageSrc="/nigerian_polling_unit_booth.png" showReportIcon />
      </div>
    </DashboardLayout>
  );
}
