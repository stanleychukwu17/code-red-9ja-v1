import { AppAvatar } from "@repo/ui/components/avatar";
import { HeaderTabs } from "@repo/ui/components/custom/AdminLayouts";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import ReportIcon from "../../icons/report-icon";

interface ActivityItem {
  id: number;
  name: string;
  text: string;
  time: string;
  meta: string;
  type: "updates" | "reports";
  avatar: string;
  badge?: string;
}

interface ActivitiesCardProps {
  electionGroupId?: number;
  stateId?: number;
  senatorialDistrictId?: number;
  federalConstituencyId?: number;
  stateAssemblyConstituencyId?: number;
  lgaId?: number;
  wardId?: number;
  fetchPollingUnitUpdates: (args: { data: any }) => Promise<any>;
}

const getVal = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "String" in val && val.Valid)
    return val.String;
  return "";
};

export function ActivitiesCard({
  electionGroupId,
  stateId,
  senatorialDistrictId,
  federalConstituencyId,
  stateAssemblyConstituencyId,
  lgaId,
  wardId,
  fetchPollingUnitUpdates,
}: ActivitiesCardProps) {
  const [activityTab, setActivityTab] = React.useState<
    "all" | "updates" | "reports"
  >("all");

  const buildQueryData = (isReport?: boolean) => ({
    electionGroupId,
    stateId,
    senatorialDistrictId,
    federalConstituencyId,
    stateAssemblyConstituencyId,
    lgaId,
    wardId,
    isReport,
    limit: 3,
  });

  const { data: updatesData, isLoading: isLoadingUpdates } = useQuery({
    queryKey: [
      "pu-updates",
      electionGroupId,
      stateId,
      senatorialDistrictId,
      federalConstituencyId,
      stateAssemblyConstituencyId,
      lgaId,
      wardId,
      false, // is_report = false
    ],
    queryFn: () => fetchPollingUnitUpdates({ data: buildQueryData(false) }),
  });
  console.log("🧲 UPDATES DATA:", updatesData);

  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: [
      "pu-updates",
      electionGroupId,
      stateId,
      senatorialDistrictId,
      federalConstituencyId,
      stateAssemblyConstituencyId,
      lgaId,
      wardId,
      true, // is_report = true
    ],
    queryFn: () => fetchPollingUnitUpdates({ data: buildQueryData(true) }),
  });

  const activities: any[] = [
    ...(updatesData?.data?.updates || updatesData?.updates || []),
    ...(reportsData?.data?.updates || reportsData?.updates || []),
  ];

  // Sort by newest first
  activities.sort((a, b) => b.id - a.id);

  const filteredActivities = activities.filter(
    (a) =>
      activityTab === "all" ||
      (activityTab === "reports" ? a.is_report : !a.is_report),
  );

  const isLoading = isLoadingUpdates || isLoadingReports;

  return (
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
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Loading activities...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No activity logs found for this filter.
          </div>
        ) : (
          filteredActivities.map((act) => {
            let timeStr = "";
            if (act.created_at) {
              const d = new Date(act.created_at);
              timeStr = d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            const firstName = getVal(act.user_first_name);
            const lastName = getVal(act.user_last_name);
            const avatarUrl = getVal(act.user_avatar);

            const name =
              `${firstName} ${lastName}`.trim() || `User #${act.user_id}`;
            const meta =
              act.media_urls && act.media_urls.length > 0
                ? `${act.media_urls.length} file(s)`
                : "";
            const badge =
              act.is_report && act.report_types && act.report_types.length > 0
                ? act.report_types.join(", ")
                : null;

            return (
              <div key={act.id} className="flex gap-4 py-4">
                <AppAvatar
                  src={
                    avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                  }
                  alt={name}
                  className="size-10 shrink-0"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "font-medium text-c-90 text-sm ",
                        act.is_report && "text-red",
                      )}
                    >
                      {name} 🎙️
                      <span className={cn("text-sm text-c-70 font-normal")}>
                        {" "}
                        {act.message}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-c-50">
                    <span>{timeStr}</span>
                    {meta && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">{meta}</span>
                      </>
                    )}
                    {act.is_report && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-red font-semibold">
                          <ReportIcon className="size-4 mb-1" />
                          Report
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
