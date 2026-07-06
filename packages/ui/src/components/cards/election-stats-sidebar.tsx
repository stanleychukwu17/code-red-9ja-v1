import * as React from "react";
import BallotIcon from "../../icons/ballot-icon";
import FancyAgentIcon from "../../icons/fancy-agent-icon";
import ReportCubeIcon from "../../icons/report-cube-icon";
import { StatCard, StatSection } from "../custom/AdminLayouts";

export function ElectionStatsSidebar() {
  return (
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
          label="Uploaded Final Result"
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
              48% <span className="text-sm text-c-50 font-normal">(31.5k)</span>
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
  );
}
