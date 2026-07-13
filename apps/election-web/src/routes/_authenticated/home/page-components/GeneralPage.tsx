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
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { ArrivalDrawer } from "../components/ArrivalDrawer";
import { DidYouVoteCard } from "../components/DidYouVoteCard";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { CandidatesLeaderboard } from "../components/Leaderboard";
import { HomeBody } from "../components/Shared";
import { UploadResultCard } from "../components/UploadResultCard";
import { PracticeTestCard } from "../components/PracticeTestCard";

export function GeneralPage() {
  const navigate = useNavigate();
  const { selectedElectionGroup, selectedElection } = useAuth();

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

  return (
    <div className="w-full min-h-screen">
      <HomeHeader daysLeft={daysLeft} />
      <HomeHeader2 title="Objectives" rightText="20%" />
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
        <CarouselDot active={carouselIndex === 1} />
        <CarouselDot active={carouselIndex === 0} />
      </CarouselDotContent>

      <HomeBody>
        {daysLeft !== 0 && <ApplicationsCard />}
        {daysLeft !== 0 && <PracticeTestCard />}
        {daysLeft === 0 && <DidYouVoteCard />}
        {daysLeft === 0 && <UploadResultCard />}
        <GiveUpdateFloatingButton />
      </HomeBody>
    </div>
  );
}
