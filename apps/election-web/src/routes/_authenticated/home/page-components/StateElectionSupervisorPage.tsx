import { useAuth } from "#/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getSingleStateStats } from "#/lib/server/election_stats";
import { Button } from "@repo/ui/components/button";
import {
  LeaderboardCardWrapper,
  ObjectiveTile,
} from "@repo/ui/components/cards/leaderboard-card";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselDotContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/components/carousel";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SupervisorTabs } from "../../../../components/Tabs";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { EarningsTab } from "../components/EarningsTab";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { CandidatesLeaderboard } from "../components/Leaderboard";
import { PracticeTestCard } from "../components/PracticeTestCard";
import { HomeBody } from "../components/Shared";
import { SupervisorStartDutyCard } from "../components/SupervisorReadyCard";
import { StateSupervisorTasksTab } from "../components/SupervisorTasksTab";
import { DidYouVoteCard } from "../components/DidYouVoteCard";

export function StateElectionSupervisorPage() {
  const navigate = useNavigate();
  const {
    selectedElectionGroup,
    selectedElection,
    selectedSupervisorAssignment,
  } = useAuth();

  const currentAssignment = selectedSupervisorAssignment?.data;

  const [activeTab, setActiveTab] = useState<"Earnings" | "Tasks">("Earnings");
  const [isArrivalDrawerOpen, setIsArrivalDrawerOpen] = useState(false);
  const [showNoInfo, setShowNoInfo] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!carouselApi) return;
    setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCarouselIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  let daysLeft: number | undefined = undefined;
  if (selectedElectionGroup?.election_date) {
    const d = new Date(selectedElectionGroup.election_date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      daysLeft = diffDays;
    }
  }

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
  });
  console.log({ statsRes });

  const partyStats = statsRes?.data?.party_stats || {};
  const targets = statsRes?.data?.targets || {};

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

  return (
    <div className="w-full min-h-screen">
      <HomeHeader daysLeft={daysLeft} />
      <HomeHeader2 title="Objectives" rightText="20%" />
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          <CarouselItem>
            <LeaderboardCardWrapper className="mx-2.5">
              {readiness.map((item) => (
                <ObjectiveTile
                  key={item.title}
                  isCompleted={item.isCompleted}
                  title={item.title}
                  rightText={item.rightText}
                  rightText2={item.rightText2}
                  onClick={() => navigate({ to: "/report" })}
                />
              ))}
              <div className="mb-2 mt-2 px-4">
                <Button
                  type="button"
                  size="extra-large"
                  onClick={() => navigate({ to: "/report" })}
                  className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
                >
                  <ReportIcon className="w-5 h-5 shrink-0" />
                  Report
                </Button>
              </div>
            </LeaderboardCardWrapper>
          </CarouselItem>
          <CarouselItem>
            <LeaderboardCardWrapper className="mx-2.5">
              {objectives.map((item) => (
                <ObjectiveTile
                  key={item.title}
                  isCompleted={item.isCompleted}
                  title={item.title}
                  rightText={item.rightText}
                  onClick={() => navigate({ to: "/report" })}
                />
              ))}
              <div className="mb-2 mt-2 px-4">
                <Button
                  type="button"
                  size="extra-large"
                  onClick={() => navigate({ to: "/report" })}
                  className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
                >
                  <ReportIcon className="w-5 h-5 shrink-0" />
                  Report
                </Button>
              </div>
            </LeaderboardCardWrapper>
          </CarouselItem>
          <CarouselItem>
            <CandidatesLeaderboard electionId={selectedElection?.id} />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
      <CarouselDotContent>
        <CarouselDot active={carouselIndex === 0} />
        <CarouselDot active={carouselIndex === 1} />
        <CarouselDot active={carouselIndex === 2} />
      </CarouselDotContent>

      <HomeBody>
        {daysLeft !== 0 && <ApplicationsCard />}
        {daysLeft !== 0 && <PracticeTestCard />}

        {daysLeft === 0 && !currentAssignment?.arrived_at && (
          <SupervisorStartDutyCard
            onReadyClick={() => {
              setShowNoInfo(false);
              setIsArrivalDrawerOpen(true);
            }}
          />
        )}
        {daysLeft === 0 && <DidYouVoteCard />}

        {/* <UploadResultCard />
        <RequestPayoutCard /> */}

        <SupervisorTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "Earnings" && <EarningsTab />}
        {activeTab === "Tasks" && (
          <StateSupervisorTasksTab isElectionDay={daysLeft === 0} />
        )}
        <GiveUpdateFloatingButton />
      </HomeBody>
    </div>
  );
}
