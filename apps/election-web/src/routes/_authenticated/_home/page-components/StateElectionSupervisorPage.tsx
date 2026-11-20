import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useQuery } from "@tanstack/react-query";
import { getSingleStateStats } from "#/lib/server/election_stats";
import { Button } from "@repo/ui/components/button";
import { ObjectiveCardWrapper, ObjectiveTile } from "@repo/ui/components/cards/objective-tile";
import { Carousel, CarouselContent, CarouselDot, CarouselDotContent, CarouselItem, type CarouselApi } from "@repo/ui/components/carousel";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReferralCard } from "../components/ReferralCard";
import { EarningsTab } from "../components/EarningsTab";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { PracticeTestCard } from "../components/PracticeTestCard";
import { HomeBody } from "../components/Shared";
import { SupervisorStartDutyCard } from "../components/SupervisorReadyCard";
import { Layout } from "@repo/ui/components/custom/AdminLayouts";
/**
 * State Election Supervisor Dashboard.
 *
 * Top-tier regional operational view for State Supervisors overseeing election
 * deployment and results collation across an entire Nigerian state:
 * - Monitors LGA supervisor, Ward supervisor, and Polling Agent deployment coverage.
 * - Tracks state-wide training completion rate (`pu_election_practice_test_readiness_percentage`).
 * - Real-time election day operational monitoring (state-wide attendance, starts, reports, EC8A uploads).
 * - Manages LGA collation progression via `StateSupervisorTasksTab`.
 */
export function StateElectionSupervisorPage() {
  const navigate = useNavigate();

  const { selectedElectionGroup, selectedElection, daysLeft } = useElection();
  const { supervisorAssignment } = useAssignments();

  const currentAssignment = supervisorAssignment?.data;

  const [isArrivalDrawerOpen, setIsArrivalDrawerOpen] = useState(false);
  const [showNoInfo, setShowNoInfo] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Synchronize carousel slide index with active dot and title
  useEffect(() => {
    if (!carouselApi) return;
    setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCarouselIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Query statewide aggregated statistics across all LGAs, Wards, and Polling Units
  const { data: statsRes } = useQuery({
    queryKey: [
      "stateStats",
      selectedElectionGroup?.id,
      currentAssignment?.state_id,
      currentAssignment?.party_id,
    ],
    queryFn: () =>
      getSingleStateStats({
        data: {
          election_group_id: selectedElectionGroup!.id,
          state_id: currentAssignment!.state_id!,
          party_id: currentAssignment!.party_id!,
        },
      }),
    enabled:
      !!selectedElectionGroup?.id &&
      !!currentAssignment?.state_id &&
      !!currentAssignment?.party_id,
    staleTime: Infinity
  });

  const partyStats = statsRes?.data?.party_stats || {};
  const targets = statsRes?.data?.targets || {};

  // Statewide pre-election readiness metrics (LGA/Ward supervisors & polling agent coverage)
  const readiness = [
    {
      title: "LGA supervisor coverage",
      rightText: `${partyStats.unique_lga_supervisors_count || 0}`,
      rightText2: `/ ${targets.lgas_count || 0}`,
      isCompleted:
        (partyStats.unique_lga_supervisors_count || 0) >=
        (targets.lgas_count || 0),
    },
    {
      title: "Ward supervisor coverage",
      rightText: `${partyStats.unique_ward_supervisors_count || 0}`,
      rightText2: `/ ${targets.wards_count || 0}`,
      isCompleted:
        (partyStats.unique_ward_supervisors_count || 0) >=
        (targets.wards_count || 0),
    },
    {
      title: "Polling agents coverage",
      rightText: `${partyStats.unique_pu_agents_count || 0}`,
      rightText2: `/ ${targets.polling_units_count || 0}`,
      isCompleted:
        (partyStats.unique_pu_agents_count || 0) >=
        (targets.polling_units_count || 0),
    },
    {
      title: "Election day practice test",
      rightText: `${partyStats.pu_election_practice_test_readiness_percentage || 0}%`,
      rightText2: "",
      isCompleted:
        (partyStats.pu_election_practice_test_readiness_percentage || 0) == 100,
    },
  ];

  // Statewide election-day operational objectives
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

  // Derive carousel slide title and percentage
  let headerTitle = "Readiness";
  let headerRightText = "";
  if (carouselIndex === 0) {
    headerTitle = "Readiness";
    const completed = readiness.filter((r) => r.isCompleted).length;
    headerRightText = `${Math.round((completed / Math.max(readiness.length, 1)) * 100)}%`;
  } else if (carouselIndex === 1) {
    headerTitle = "Objectives";
    const completed = objectives.filter((o) => o.isCompleted).length;
    headerRightText = `${Math.round((completed / Math.max(objectives.length, 1)) * 100)}%`;
  }

  return (
    <Layout>
      <HomeHeader daysLeft={daysLeft} />

      <HomeHeader2 title={headerTitle} rightText={headerRightText} />

      {/* Primary Carousel: Readiness and Objectives */}
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          <CarouselItem>
            <ObjectiveCardWrapper className="mx-2.5">
              {readiness.map((item) => (
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
          <CarouselItem>
            <ObjectiveCardWrapper className="mx-2.5">
              {objectives.map((item) => (
                <ObjectiveTile
                  key={item.title}
                  isCompleted={item.isCompleted}
                  title={item.title}
                  rightText={item.rightText}
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

      {/* Pagination indicators */}
      <CarouselDotContent>
        <CarouselDot active={carouselIndex === 0} />
        <CarouselDot active={carouselIndex === 1} />
      </CarouselDotContent>

      {/* Supervisor Action Body */}
      <HomeBody>
        <ReferralCard onClick={() => navigate({ to: "/referrals" })} />
        {daysLeft !== 0 && <PracticeTestCard />}

        {/* On election day: prompt supervisor to start official monitoring duty */}
        {daysLeft === 0 && !currentAssignment?.arrived_at && (
          <SupervisorStartDutyCard
            onReadyClick={() => {
              setShowNoInfo(false);
              setIsArrivalDrawerOpen(true);
            }}
          />
        )}

        {/* Earnings */}
        <EarningsTab />

        {/* Emergency incident report FAB */}
        {daysLeft === 0 && (
          <GiveUpdateFloatingButton
            onClick={() => navigate({ to: "/supervisor-update" as any })}
          />
        )}
      </HomeBody>
    </Layout>
  );
}
