import { useElection } from "#/hooks/useElection";
import { getNationalMetrics } from "#/lib/server/national_metrics";
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
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { DidYouVoteCard } from "../components/DidYouVoteCard";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { CandidatesLeaderboard } from "../components/Leaderboard";
import { PracticeTestCard } from "../components/PracticeTestCard";
import { ReferralCard } from "../components/ReferralCard";
import { HomeBody } from "../components/Shared";
import { UploadResultCard } from "../components/UploadResultCard";
import { MyPollingUnit } from "../components/MyPollingUnit";
import { Route } from "..";

/**
 * General Citizen / Unassigned Voter Dashboard.
 *
 * Rendered for users who do not have an active polling agent or supervisor assignment.
 * Provides citizen engagement features:
 * - Election countdown and polling unit setup.
 * - Training practice tests and educational milestones.
 * - Live candidate leaderboard and election updates.
 * - Election day participation prompt (`DidYouVoteCard`) and citizen result upload (`UploadResultCard`).
 * - Application call-to-action for becoming an accredited agent or supervisor.
 * - Viral voter referral link and reward tracking.
 */
export function GeneralPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;

  const { selectedElectionGroup, selectedElection } = useElection();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Query nationwide aggregation metrics (total voters, turnouts, registered agents)
  const { data: metricsResponse } = useQuery({
    queryKey: ["national-metrics"],
    queryFn: async () => {
      const res = await getNationalMetrics();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const metrics = metricsResponse || null;

  // Track carousel slide changes to update header title and progress stats
  useEffect(() => {
    if (!carouselApi) return;
    setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCarouselIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Calculate days remaining until scheduled election
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

  // Voter civic readiness & practice training milestones
  const objectives = [
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

  // Dynamic header based on active slide
  let headerTitle = "Objectives";
  let headerRightText = "";
  if (carouselIndex === 0) {
    headerTitle = "Objectives";
    const completed = objectives.filter((o) => o.isCompleted).length;
    headerRightText = `${Math.round((completed / Math.max(objectives.length, 1)) * 100)}%`;
  } else if (carouselIndex === 1) {
    headerTitle = "Elections";
    headerRightText = "";
  }

  return (
    <div className="w-full min-h-screen">
      {/* Top dashboard header with countdown and user polling unit summary */}
      <HomeHeader daysLeft={daysLeft} />
      {!search.isPractice && <MyPollingUnit />}
      <HomeHeader2 title={headerTitle} rightText={headerRightText} />

      {/* Main carousel: Voter objectives & live candidate leaderboard */}
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          <CarouselItem>
            <LeaderboardCardWrapper className="mx-2.5">
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
                    variant="leaderboardGrey"
                    size="extra-large"
                    onClick={() =>
                      navigate({
                        to: "/give-update",
                        search: { isReport: true },
                      })
                    }
                    className="w-full"
                  >
                    <ReportIcon className="w-5 h-5 shrink-0" />
                    Report
                  </Button>
                </div>
              )}
            </LeaderboardCardWrapper>
          </CarouselItem>
          <CarouselItem>
            <CandidatesLeaderboard hideReportButton={daysLeft !== 0} />
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      {/* Slide pagination dots */}
      <CarouselDotContent>
        <CarouselDot active={carouselIndex === 1} />
        <CarouselDot active={carouselIndex === 0} />
      </CarouselDotContent>

      {/* Action Cards Body */}
      <HomeBody>
        {/* On election day: prompt voter if they voted */}
        {daysLeft === 0 && (
          <DidYouVoteCard onYesClick={() => navigate({ to: "/vote" })} />
        )}

        {/* On election day: permit citizens to crowdsource EC8A result sheets */}
        {daysLeft === 0 && (
          <UploadResultCard
            onClick={() => navigate({ to: "/upload-result" })}
          />
        )}

        {/* Opportunity to apply as an accredited party supervisor or agent */}
        <ApplicationsCard />

        {/* Citizen referral recruitment card */}
        <ReferralCard onClick={() => navigate({ to: "/referrals" })} />

        {/* Practice voting test */}
        <PracticeTestCard />

        {/* Quick incident report FAB on election day */}
        {daysLeft === 0 && (
          <GiveUpdateFloatingButton
            onClick={() => navigate({ to: "/give-update" })}
          />
        )}
      </HomeBody>
    </div>
  );
}
