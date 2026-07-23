import * as React from "react";
import BallotIcon from "../../icons/ballot-icon";
import FancyAgentIcon from "../../icons/fancy-agent-icon";
import ReportCubeIcon from "../../icons/report-cube-icon";
import { StatCard, StatSection } from "../custom/AdminLayouts";
import { getLocalTime } from "../../lib/date";

function SText({
  title,
  subtitle,
  shorten = false,
}: {
  title: string | number;
  subtitle?: string;
  shorten?: boolean;
}) {
  const formattedTitle = React.useMemo(() => {
    if (typeof title === "number") {
      if (shorten) {
        return Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 1,
        })
          .format(title)
          .toLowerCase();
      }
      return new Intl.NumberFormat("en-US").format(title);
    }
    return title;
  }, [title, shorten]);

  return (
    <span className="flex items-center gap-1">
      {formattedTitle}{" "}
      {subtitle && <span className="text-c-50 font-normal">{subtitle}</span>}
    </span>
  );
}

export function ElectionStatsSidebar({
  stats,
  targets,
  isLoading,
}: {
  stats?: any;
  targets?: any;
  isLoading?: boolean;
}) {
  const [shortenState, setShortenState] = React.useState<
    Record<string, boolean>
  >({});

  const isShortened = (section: string) => shortenState[section] || false;
  const toggleShorten = (section: string) =>
    setShortenState((prev) => ({ ...prev, [section]: !prev[section] }));

  // Helper to safely get value and format
  const getVal = (val: any) => val || 0;

  // Calculate percentage
  const getPct = (val: any, total: any) => {
    if (!total || total === 0) return "(0%)";
    const v = getVal(val);
    const pct = (v / total) * 100;
    return `(${pct % 1 === 0 ? pct : pct.toFixed(1)}%)`;
  };

  const totalPUs = getVal(targets?.polling_units_count);
  const totalAgents = getVal(targets?.pu_agents_count);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-48 bg-c-5/50 rounded-[20px]"></div>
          <div className="h-48 bg-c-5/50 rounded-[20px]"></div>
          <div className="h-48 bg-c-5/50 rounded-[20px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Polling Units Stats */}
      <StatSection
        title="Polling Units (PU)"
        onFormatToggle={() => toggleShorten("pu")}
        isShortened={isShortened("pu")}
      >
        <StatCard
          label="Total PUs"
          value={<SText title={totalPUs} shorten={isShortened("pu")} />}
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Total PUs with Agents"
          value={
            <SText
              title={getVal(stats?.total_pu_with_agents_in_attendance)}
              subtitle={getPct(
                stats?.total_pu_with_agents_in_attendance,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Election started in"
          value={
            <SText
              title={getVal(stats?.total_pu_where_election_has_started)}
              subtitle={getPct(
                stats?.total_pu_where_election_has_started,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Avg. Election Start Time"
          value={
            <SText
              title={
                stats?.pu_average_election_started_at
                  ? getLocalTime(stats?.pu_average_election_started_at)
                  : "-"
              }
            />
          }
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Election ended in"
          value={
            <SText
              title={getVal(stats?.total_pu_where_election_has_ended)}
              subtitle={getPct(
                stats?.total_pu_where_election_has_ended,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Avg. Election End Time"
          value={
            <SText
              title={
                stats?.pu_average_election_ended_at
                  ? getLocalTime(stats?.pu_average_election_ended_at)
                  : "-"
              }
            />
          }
          icon={<BallotIcon className="size-5" />}
        />
        <StatCard
          label="Total Final Result Expected"
          value={<SText title={totalPUs} shorten={isShortened("pu")} />}
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="Total Final Result Uploaded"
          value={
            <SText
              title={getVal(stats?.total_pu_unique_final_results_uploaded)}
              subtitle={getPct(
                stats?.total_pu_unique_final_results_uploaded,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="PU with 1 or more Uploaded Result"
          value={
            <SText
              title={getVal(stats?.pu_final_results_uploaded_count)}
              subtitle={getPct(
                stats?.pu_final_results_uploaded_count,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="PU with Complete Result"
          value={
            <SText
              title={getVal(stats?.unique_pu_final_results_uploaded_count)}
              subtitle={getPct(
                stats?.unique_pu_final_results_uploaded_count,
                totalPUs,
              )}
              shorten={isShortened("pu")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
      </StatSection>

      {/* Polling Agents Stats */}
      <StatSection
        title="Polling Agents"
        onFormatToggle={() => toggleShorten("agents")}
        isShortened={isShortened("agents")}
      >
        <StatCard
          label="Total Agents"
          value={
            <SText
              title={getVal(stats?.pu_agents_count)}
              shorten={isShortened("agents")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="Agents in Attendance"
          value={
            <SText
              title={getVal(stats?.pu_agents_in_attendance_count)}
              subtitle={getPct(
                stats?.pu_agents_in_attendance_count,
                stats?.pu_agents_count || 1,
              )}
              shorten={isShortened("agents")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="Avg. Agent Arrival Time"
          value={
            <SText
              title={
                stats?.pu_average_arrival_time
                  ? getLocalTime(stats?.pu_average_arrival_time)
                  : "-"
              }
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
        <StatCard
          label="Live voters reffered by agent"
          value={
            <SText
              title={getVal(stats?.pu_live_voters_referred_by_agent_count)}
              shorten={isShortened("agents")}
            />
          }
          icon={<FancyAgentIcon className="size-5" />}
        />
      </StatSection>

      {/* Reports Stats */}
      <StatSection
        title="Updates"
        onFormatToggle={() => toggleShorten("updates")}
        isShortened={isShortened("updates")}
      >
        <StatCard
          label="Total Updates"
          value={
            <SText
              title={getVal(stats?.updates_count)}
              shorten={isShortened("updates")}
            />
          }
          icon={<ReportCubeIcon className="size-5" />}
        />
        <StatCard
          label="PU with Updates"
          value={
            <SText
              title={getVal(stats?.total_pu_with_updates)}
              subtitle={getPct(stats?.total_pu_with_updates, totalPUs)}
              shorten={isShortened("updates")}
            />
          }
          icon={<ReportCubeIcon className="size-5" />}
        />
        <StatCard
          label="Total Reports"
          value={
            <SText
              title={getVal(stats?.reports_count)}
              shorten={isShortened("updates")}
            />
          }
          icon={<ReportCubeIcon className="size-5" />}
        />
        <StatCard
          label="Reported PUs"
          value={
            <SText
              title={getVal(stats?.total_pu_with_reports)}
              subtitle={getPct(stats?.total_pu_with_reports, totalPUs)}
              shorten={isShortened("updates")}
            />
          }
          icon={<ReportCubeIcon className="size-5" />}
        />
        <StatCard
          label="Avg. Update Time Interval"
          value={
            <SText
              title={
                getVal(stats?.pu_average_update_time_interval_in_seconds) > 0
                  ? (
                      stats.pu_average_update_time_interval_in_seconds / 60
                    ).toFixed(0)
                  : 0
              }
              subtitle={`minutes`}
              shorten={isShortened("updates")}
            />
          }
          icon={<ReportCubeIcon className="size-5" />}
        />
      </StatSection>
    </div>
  );
}
