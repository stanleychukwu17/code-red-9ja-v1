import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useQuery } from "@tanstack/react-query";
import { getSingleWardStats } from "#/lib/server/election_stats";
import { Button } from "@repo/ui/components/button";
import {
  ObjectiveCardWrapper,
  ObjectiveTile,
} from "@repo/ui/components/cards/objective-tile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@repo/ui/components/carousel";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ReferralCard } from "../components/ReferralCard";
import { EarningsTab } from "../components/EarningsTab";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader2 } from "../components/HomeHeader";
import { PracticeTestComingSoonCard } from "../components/PracticeTestCard";
import { HomeBody } from "../components/Shared";
import { SupervisorStartDutyCard } from "../components/SupervisorReadyCard";

/**
 * Ward Election Supervisor Dashboard.
 *
 * Operational dashboard for Ward Supervisors responsible for coordinating
 * all polling unit agents within their ward:
 * - Monitors polling agent recruitment and training coverage.
 * - Tracks agent attendance, poll opening statuses, interval updates, and result uploads.
 * - Confirms duty readiness via `SupervisorStartDutyCard`.
 * - Provides granular sub-unit tracking via `WardSupervisorTasksTab`.
 */
export function WardElectionSupervisorPage() {
  const navigate = useNavigate();

  const { selectedElectionGroup, selectedElection, daysLeft } = useElection();
  const { supervisorAssignment } = useAssignments();

  const currentAssignment = supervisorAssignment?.data;

  const [isArrivalDrawerOpen, setIsArrivalDrawerOpen] = useState(false);
  const [showNoInfo, setShowNoInfo] = useState(false);

  // Query aggregated ward statistics (polling unit coverage, agent check-ins, result uploads)
  const { data: statsRes } = useQuery({
    queryKey: [
      "wardStats",
      selectedElectionGroup?.id,
      currentAssignment?.ward_id,
      currentAssignment?.party_id,
    ],
    queryFn: () =>
      getSingleWardStats({
        data: {
          election_group_id: selectedElectionGroup!.id,
          ward_id: currentAssignment!.ward_id!,
          party_id: currentAssignment!.party_id!,
        },
      }),
    enabled:
      !!selectedElectionGroup?.id &&
      !!currentAssignment?.ward_id &&
      !!currentAssignment?.party_id,
    staleTime: Infinity,
  });

  const partyStats = statsRes?.data?.party_stats || {};
  const targets = statsRes?.data?.targets || {};

  // Ward election-day operations metrics (attendance, starts, updates, results)
  const objectives = [
    {
      title: "Agents that are at their PU",
      rightText: `${partyStats.pu_agents_in_attendance_count || 0}`,
      rightText2: `/ ${partyStats.pu_agents_count || 0}`,
      isCompleted:
        (partyStats.pu_agents_in_attendance_count || 0) >=
        (partyStats.pu_agents_count || 1),
    },
    {
      title: "PU election have started in",
      rightText: `${partyStats.total_pu_where_election_has_started || 0}`,
      rightText2: `/ ${targets.polling_units_count || 0}`,
      isCompleted: false,
    },
    {
      title: "Agent Updates",
      rightText: `${partyStats.updates_count || 0}`,
      rightText2: "",
      isCompleted: false,
    },
    {
      title: "Agent Reports",
      rightText: `${partyStats.reports_count || 0}`,
      rightText2: "",
      isCompleted: false,
    },
    {
      title: "Results uploaded",
      rightText: `${partyStats.pu_final_results_uploaded_count || 0}`,
      rightText2: `/ ${targets.polling_units_count || 0}`,
      isCompleted: false,
    },
  ];

  // Derive header title and percentage from objectives
  const completed = objectives.filter((o) => o.isCompleted).length;
  const headerTitle = "Objectives";
  const headerRightText = `${Math.round((completed / Math.max(objectives.length, 1)) * 100)}%`;

  return (
    <>
      <HomeHeader2 title={headerTitle} rightText={headerRightText} />

      {/* Primary Checklist: Objectives */}
      <Carousel className="w-full">
        <CarouselContent>
          <CarouselItem>
            <ObjectiveCardWrapper className="mx-2.5">
              {objectives.map((item) => (
                <ObjectiveTile
                  key={item.title}
                  isCompleted={item.isCompleted}
                  title={item.title}
                  rightText={item.rightText}
                  rightText2={item.rightText2}
                  onClick={() =>
                    navigate({ to: "/give-update", search: { isReport: true } })
                  }
                />
              ))}
              {daysLeft === 0 && (
                <div className="mb-2 mt-2 px-4">
                  <Button
                    type="button"
                    size="extra-large"
                    onClick={() =>
                      navigate({
                        to: "/give-update",
                        search: { isReport: true },
                      })
                    }
                    className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-12"
                  >
                    <ReportIcon className="w-5 h-5 shrink-0" />
                    Report
                  </Button>
                </div>
              )}
            </ObjectiveCardWrapper>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      {/* Supervisor Action Body */}
      <HomeBody>
        {/* On election day: prompt supervisor to start official monitoring duty */}
        {daysLeft === 0 && !currentAssignment?.arrived_at && (
          <SupervisorStartDutyCard
            onReadyClick={() => {
              setShowNoInfo(false);
              setIsArrivalDrawerOpen(true);
            }}
          />
        )}

        {/* Referrals and practice tests */}
        <ReferralCard onClick={() => navigate({ to: "/referrals" })} />
        {daysLeft !== 0 && <PracticeTestComingSoonCard />}

        {/* Earnings */}
        <EarningsTab />

        {/* Emergency incident report FAB */}
        {daysLeft === 0 && (
          <GiveUpdateFloatingButton
            onClick={() => navigate({ to: "/supervisor-update" as any })}
          />
        )}
      </HomeBody>
    </>
  );
}
