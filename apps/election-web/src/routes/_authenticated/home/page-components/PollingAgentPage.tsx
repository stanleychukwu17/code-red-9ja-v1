import { useAuth } from "#/hooks/useAuth";
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
import PlusIcon from "@repo/ui/icons/plus-icon";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HomeTabs } from "../../../../components/Tabs";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { ArrivalCard } from "../components/ArrivalCard";
import { ArrivalDrawer } from "../components/ArrivalDrawer";
import { ContactPartyTab } from "../components/ContactPartyTab";
import { DidYouVoteCard } from "../components/DidYouVoteCard";
import { EarningsTab } from "../components/EarningsTab";
import { ElectionStatusCard } from "../components/ElectionStatusCard";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { CandidatesLeaderboard } from "../components/Leaderboard";
import { PracticeTestCard } from "../components/PracticeTestCard";
import { RequestPayoutCard } from "../components/RequestPayoutCard";
import { UploadResultCard } from "../components/UploadResultCard";
import { UploadsTab } from "../components/UploadsTab";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeBody } from "../components/Shared";
import { MyPollingUnit } from "../components/MyPollingUnit";

export function PollingAgentPage() {
  const navigate = useNavigate();
  const {
    selectedElectionGroup,
    selectedElection,
    selectedAssignment: currentPollingUnitAssignment,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "Earnings" | "Contact" | "Uploads"
  >("Earnings");
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
  let diffDays: number | undefined = undefined;
  if (selectedElectionGroup?.election_date) {
    const d = new Date(selectedElectionGroup.election_date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - now.getTime();
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      daysLeft = diffDays;
    }
  }

  const showObjectives = diffDays === undefined || diffDays <= 0;
  const showReadiness = diffDays === undefined || diffDays !== 0;

  const objectives = [
    {
      title: "Go to your polling unit & click I've arrived",
      isCompleted: !!currentPollingUnitAssignment?.arrived_at,
    },
    {
      title: "Enter time when election started",
      isCompleted: !!currentPollingUnitAssignment?.election_started_at,
    },
    {
      title: "Give updates every 30minutes (7AM - 5PM)",
      isCompleted: !!(
        currentPollingUnitAssignment?.interval_updates &&
        Object.keys(currentPollingUnitAssignment.interval_updates).length > 0
      ),
    },
    {
      title: "Report any issue",
      isCompleted: !!(
        currentPollingUnitAssignment?.reports_count &&
        currentPollingUnitAssignment.reports_count > 0
      ),
    },
    {
      title: "Upload final vote result",
      isCompleted: !!(
        currentPollingUnitAssignment?.results_submitted_count &&
        currentPollingUnitAssignment.results_submitted_count > 0 &&
        currentPollingUnitAssignment.results_submitted_count >=
          (currentPollingUnitAssignment.results_expected_to_submit_count || 1)
      ),
    },
    {
      title: "Enter time when election ended",
      isCompleted: !!currentPollingUnitAssignment?.election_ended_at,
    },
    {
      title:
        "Get voters at your polling unit to register on free9ja, indicate who they voted for. (1)",
      isCompleted: !!(
        currentPollingUnitAssignment?.live_voters_referred_count &&
        currentPollingUnitAssignment.live_voters_referred_count > 0
      ),
    },
  ];

  const readiness = [
    {
      title: "Take election day practice test 1",
      rightText: "Jul 20",
      isCompleted: true,
    },
    {
      title: "Take election day practice test 2",
      rightText: "Jul 27",
      isCompleted: false,
    },
    {
      title: "Take election day practice test 3",
      rightText: "Aug 2",
      isCompleted: false,
    },
  ];

  let headerTitle = "";
  let headerRightText = "";
  const carouselItems: { title: string; rightText: string }[] = [];

  if (showObjectives) {
    const completed = objectives.filter((o) => o.isCompleted).length;
    carouselItems.push({
      title: "Objectives",
      rightText: `${Math.round((completed / Math.max(objectives.length, 1)) * 100)}%`,
    });
  }
  if (showReadiness) {
    const completed = readiness.filter((r) => r.isCompleted).length;
    carouselItems.push({
      title: "Readiness",
      rightText: `${Math.round((completed / Math.max(readiness.length, 1)) * 100)}%`,
    });
  }
  carouselItems.push({
    title: "Elections",
    rightText: "",
  });

  if (carouselItems[carouselIndex]) {
    headerTitle = carouselItems[carouselIndex].title;
    headerRightText = carouselItems[carouselIndex].rightText;
  }

  return (
    <div className="w-full min-h-screen">
      <HomeHeader daysLeft={daysLeft} />
      <HomeHeader2 title={headerTitle} rightText={headerRightText} />
      <MyPollingUnit />
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          {showObjectives && (
            <CarouselItem>
              <LeaderboardCardWrapper className="mx-2.5">
                {objectives.map((item) => (
                  <ObjectiveTile
                    key={item.title}
                    isCompleted={item.isCompleted}
                    title={item.title}
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
          )}
          {showReadiness && (
            <CarouselItem>
              <LeaderboardCardWrapper className="mx-2.5">
                {readiness.map((item) => (
                  <ObjectiveTile
                    key={item.title}
                    isCompleted={item.isCompleted}
                    title={item.title}
                    rightText={item.rightText}
                    onClick={() => navigate({ to: "/report" })}
                  />
                ))}
              </LeaderboardCardWrapper>
            </CarouselItem>
          )}
          <CarouselItem>
            <CandidatesLeaderboard />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
      <CarouselDotContent>
        {Array.from({
          length: (showObjectives ? 1 : 0) + (showReadiness ? 1 : 0) + 1,
        }).map((_, i) => (
          <CarouselDot key={i} active={carouselIndex === i} />
        ))}
      </CarouselDotContent>

      <HomeBody>
        {daysLeft !== undefined && daysLeft !== 0 && <ApplicationsCard />}
        {daysLeft !== undefined && daysLeft !== 0 && <PracticeTestCard />}

        {daysLeft === 0 &&
          currentPollingUnitAssignment &&
          !currentPollingUnitAssignment.arrived_at && (
            <ArrivalCard
              onArrivedClick={() => {
                setShowNoInfo(false);
                setIsArrivalDrawerOpen(true);
              }}
            />
          )}

        {currentPollingUnitAssignment &&
          currentPollingUnitAssignment.arrived_at &&
          !currentPollingUnitAssignment.election_ended_at && (
            <ElectionStatusCard
              hasStarted={!!currentPollingUnitAssignment.election_started_at}
              onStartClick={() => {
                if (currentPollingUnitAssignment.id) {
                  navigate({
                    to: "/election-start",
                    search: {
                      assignmentId: currentPollingUnitAssignment.id,
                    } as any,
                  });
                } else {
                  navigate({ to: "/election-start" });
                }
              }}
              onEndClick={() => {
                if (currentPollingUnitAssignment.id) {
                  navigate({
                    to: "/election-end",
                    search: {
                      assignmentId: currentPollingUnitAssignment.id,
                    } as any,
                  });
                } else {
                  navigate({ to: "/election-end" });
                }
              }}
            />
          )}
        {daysLeft === 0 && <DidYouVoteCard />}

        {currentPollingUnitAssignment &&
          currentPollingUnitAssignment.election_ended_at && (
            <>
              <UploadResultCard />
              <RequestPayoutCard />
            </>
          )}

        <HomeTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "Earnings" && <EarningsTab />}
        {activeTab === "Contact" && <ContactPartyTab />}
        {activeTab === "Uploads" && <UploadsTab />}
      </HomeBody>

      <ArrivalDrawer
        isOpen={isArrivalDrawerOpen}
        onOpenChange={setIsArrivalDrawerOpen}
        showNoInfo={showNoInfo}
        onNoClick={() => setShowNoInfo(true)}
        onYesClick={() => {
          if (currentPollingUnitAssignment?.id) {
            navigate({
              to: "/arrival/video",
              search: { assignmentId: currentPollingUnitAssignment.id } as any,
            });
          } else {
            navigate({ to: "/arrival/video" });
          }
        }}
        onDismiss={() => setIsArrivalDrawerOpen(false)}
        electionDate={selectedElectionGroup?.election_date}
      />

      <GiveUpdateFloatingButton />
    </div>
  );
}
