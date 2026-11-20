import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useQuery } from "@tanstack/react-query";
import { getSingleLgaStats } from "#/lib/server/election_stats";
import { Button } from "@repo/ui/components/button";
import { ObjectiveCardWrapper, ObjectiveTile } from "@repo/ui/components/cards/objective-tile";
import { Carousel, CarouselContent, CarouselDot, CarouselDotContent, CarouselItem, type CarouselApi } from "@repo/ui/components/carousel";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReferralCard } from "../components/ReferralCard";
import { EarningsTab } from "../components/EarningsTab";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader2 } from "../components/HomeHeader";
import { PracticeTestComingSoonCard } from "../components/PracticeTestCard";
import { HomeBody } from "../components/Shared";
import { SupervisorStartDutyCard } from "../components/SupervisorReadyCard";

/**
 * Local Government Area (LGA) Election Supervisor Dashboard.
 *
 * Operational dashboard for LGA Supervisors responsible for overseeing election
 * logistics across all wards within the LGA:
 * - Monitors ward supervisor recruitment coverage (`unique_ward_supervisors_count`).
 * - Tracks polling agent recruitment and training completion across all polling units.
 * - Monitors election day turnouts, incident reports, and result sheet uploads.
 * - Manages ward-level collation and supervisor task progress via `LgaSupervisorTasksTab`.
 */
export function LGAElectionSupervisorPage() {
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

  // Query aggregated LGA statistics across all wards and polling units
  const { data: statsRes } = useQuery({
    queryKey: [
      "lgaStats",
      selectedElectionGroup?.id,
      currentAssignment?.lga_id,
      currentAssignment?.party_id,
    ],
    queryFn: () =>
      getSingleLgaStats({
        data: {
          election_group_id: selectedElectionGroup!.id,
          lga_id: currentAssignment!.lga_id!,
          party_id: currentAssignment!.party_id!,
        },
      }),
    enabled:
      !!selectedElectionGroup?.id &&
      !!currentAssignment?.lga_id &&
      !!currentAssignment?.party_id,
    staleTime: Infinity,
  });

  const partyStats = statsRes?.data?.party_stats || {};
  const targets = statsRes?.data?.targets || {};

  // LGA pre-election readiness metrics (ward supervisors coverage & agent test passage)
  const readiness = [
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

  // LGA election-day operations metrics across the LGA
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
    <>
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
        {daysLeft !== undefined && daysLeft !== 0 && <PracticeTestComingSoonCard />}

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
