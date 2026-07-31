import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { useAuth } from "#/hooks/useAuth";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  LeaderboardCardWrapper,
  ObjectiveTile,
} from "@repo/ui/components/cards/leaderboard-card";
import { InfoCard, SelectableCard } from "@repo/ui/components/cards/Rewards";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselDotContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/components/carousel";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import { Label } from "@repo/ui/components/input";
import AlertIcon from "@repo/ui/icons/alert-icon";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import NigerianFlagIcon from "@repo/ui/icons/nigerian-flag-icon";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import ReportIcon from "@repo/ui/icons/report-icon";
import StarIcon from "@repo/ui/icons/star-icon";
import TwinkleLittleStarIcon from "@repo/ui/icons/twinkle-little-star-icon";
import { cn } from "@repo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HomeTabs } from "../../../../components/Tabs";
import { ArrivalCard } from "../../home/components/ArrivalCard";
import { ArrivalDrawer } from "../../home/components/ArrivalDrawer";
import { ContactPartyTab } from "../../home/components/ContactPartyTab";
import { DidYouVoteCard } from "../../home/components/DidYouVoteCard";
import { EarningsTab } from "../../home/components/EarningsTab";
import { ElectionStatusCard } from "../../home/components/ElectionStatusCard";
import { GiveUpdateFloatingButton } from "../../home/components/GiveUpdateFloatingButton";
import { HomeHeader, HomeHeader2 } from "../../home/components/HomeHeader";
import { CandidatesLeaderboard } from "../../home/components/Leaderboard";
import { MyPollingUnit } from "../../home/components/MyPollingUnit";
import { ReferralCard } from "../../home/components/ReferralCard";
import { RequestPayoutCard } from "../../home/components/RequestPayoutCard";
import { HomeBody } from "../../home/components/Shared";
import { UploadResultCard } from "../../home/components/UploadResultCard";
import { UploadsTab } from "../../home/components/UploadsTab";
import { showFeedbackToast } from "./utils";
import { TaskType, PracticeTaskType, pollingAgentTest } from "./tasks-data";
import { useQueryState, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { useLocalStorage } from "usehooks-ts";

export function PollingAgentPracticePage() {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useQueryState(
    "taskId",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false }),
  );

  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsStringLiteral([
      "welcome",
      "tutorial",
      "quiz",
      "practical",
      "dashboard",
      "completed",
      "final",
    ] as const)
      .withDefault("welcome")
      .withOptions({ clearOnDefault: false }),
  );

  const [, setIsPractice] = useQueryState(
    "isPractice",
    parseAsStringLiteral(["true"] as const)
      .withDefault("true")
      .withOptions({ clearOnDefault: false }),
  );

  useEffect(() => {
    setIsPractice("true");
  }, [setIsPractice]);

  const [currentFailedAttempts, setCurrentFailedAttempts] = useState(0);
  const [quizSelectedOptionId, setQuizSelectedOptionId] = useState<
    number | null
  >(null);

  const [testStats, setTestStats] = useLocalStorage<
    {
      taskId: number;
      failedAttempt: number;
      completed: boolean;
      score: number;
    }[]
  >("practice-test-stats", []);

  const currentTaskIndex = pollingAgentTest.findIndex((t) => t.id === taskId);
  const validTaskIndex = currentTaskIndex === -1 ? 0 : currentTaskIndex;
  const currentTask = pollingAgentTest[validTaskIndex];

  const handleNextTask = () => {
    const nextTask = pollingAgentTest[validTaskIndex + 1];
    if (nextTask) {
      setTaskId(nextTask.id);
      setCurrentPage("tutorial");
    } else {
      setCurrentPage("final");
    }
  };

  const handleQuizNext = () => {
    if (!currentTask) return;

    if (quizSelectedOptionId === currentTask.quiz.correctOptionId) {
      showFeedbackToast(true);
      setCurrentPage("practical");
    } else {
      showFeedbackToast(false);
      setCurrentFailedAttempts((prev) => prev + 1);
      setQuizSelectedOptionId(null);
    }
  };

  const handleDashboardCorrect = () => {
    if (!currentTask) return;

    const taskScore = Math.max(0, 10 - currentFailedAttempts * 2);
    setTestStats((prev) => [
      ...prev,
      {
        taskId: currentTask.id,
        failedAttempt: currentFailedAttempts,
        completed: true,
        score: taskScore,
      },
    ]);
    setCurrentPage("completed");
  };

  const handleDashboardWrong = () => {
    setCurrentFailedAttempts((prev) => prev + 1);
  };

  const currentScore = testStats.reduce((acc, stat) => acc + stat.score, 0);
  const finalScore = testStats.length > 0 ? currentScore / testStats.length : 0;
  const currentTaskScore = Math.max(0, 10 - currentFailedAttempts * 2);

  return (
    <div className="w-full h-full">
      {currentPage === "welcome" && (
        <WelcomePage
          practiceTestNumber={1}
          potentialPayout={500}
          onNextClick={() => setCurrentPage("tutorial")}
        />
      )}

      {currentPage === "tutorial" && currentTask && (
        <TutorialPage
          taskNumber={validTaskIndex + 1}
          title={currentTask.tutorial.title as any}
          subtitle={currentTask.tutorial.subtitle as any}
          video={currentTask.tutorial.video as any}
          onNextClick={() => {
            setCurrentFailedAttempts(0);
            setQuizSelectedOptionId(null);
            setCurrentPage("quiz");
          }}
        />
      )}

      {currentPage === "quiz" && currentTask && (
        <QuizPage
          taskNumber={validTaskIndex + 1}
          title={currentTask.quiz.title}
          options={currentTask.quiz.options}
          selectedOptionId={quizSelectedOptionId}
          onSelectOption={setQuizSelectedOptionId}
          onNextClick={handleQuizNext}
        />
      )}

      {currentPage === "practical" && currentTask && (
        <PracticalQuestionPage
          taskNumber={validTaskIndex + 1}
          title1={currentTask.practical.title1}
          title2={currentTask.practical.title2}
          onNextClick={() => setCurrentPage("dashboard")}
        />
      )}

      {currentPage === "dashboard" && currentTask && (
        <DashboardPage
          tasks={{
            arriveAtPollingUnit: validTaskIndex > 0,
            startElection: validTaskIndex > 1,
            endElection: validTaskIndex > 6,
            giveUpdate: validTaskIndex > 2,
            giveReport: validTaskIndex > 3,
            uploadResult: validTaskIndex > 5,
            referVoters: validTaskIndex > 7,
          }}
          taskType={currentTask.practical.taskType}
          onCorrect={handleDashboardCorrect}
          onWrong={handleDashboardWrong}
          failedAttemptCount={currentFailedAttempts}
        />
      )}

      {currentPage === "completed" && currentTask && (
        <TaskCompletedPage
          score={currentTaskScore}
          maxScore={10}
          failedAttempts={currentFailedAttempts}
          note={currentTask.note}
          onNextClick={handleNextTask}
        />
      )}

      {currentPage === "final" && (
        <FinalScorePage
          score={Number(finalScore.toFixed(2))}
          maxScore={10}
          onNextClick={() => navigate({ to: "/" })}
        />
      )}
    </div>
  );
}

export function WelcomePage({
  potentialPayout,
  practiceTestNumber,
  onNextClick,
}: {
  potentialPayout: number;
  practiceTestNumber: number;
  onNextClick: () => void;
}) {
  const { party } = useAuth();

  const handleBackClick = () => {
    console.log("Go Back Clicked!");
  };

  return (
    <div className="w-full h-full">
      <PageHeader onBackClick={handleBackClick} />

      <div className="relative flex flex-col items-center gap-3 h-full px-4 pt-16 max-w-[430px]">
        <BackgroundDesign />
        <AppAvatar src={party?.logo} alt="Party Logo" className="size-7" />
        <TitleText
          text={`Election Day Practice Test ${practiceTestNumber}`}
          size="xl"
          className="text-center text-c-90"
        />
        <DescriptiveText
          text="Prepare yourself for the coming election"
          size="sm"
        />
        <div className="pt-5 space-y-3">
          <InfoCard
            icon={<FancyMoneyBagIcon className="size-6" />}
            label="Potential Payout"
            value={`₦0 to ₦${potentialPayout}`}
            variant="yellow"
            className="w-full"
          />
          <InfoCard
            icon={<AlertIcon className="size-6" />}
            label="Your final score will determine your payout. Low performers may be replaced by the party."
            variant="grey"
            className="w-full"
          />
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          Start Practice Test
        </Button>
      </StickyFooter>
    </div>
  );
}

export function ApplicationAcceptedPage({
  onNextClick,
}: {
  onNextClick?: () => void;
}) {
  const { party } = useAuth();

  const Todo = ({ text }: { text: string }) => (
    <div className="flex gap-4 py-2">
      <div className="size-6 rounded-full bg-c-10 shrink-0" />
      <p className="text-lg leading-6 text-c-60">{text}</p>
    </div>
  );

  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={() => null} />

      <div className="relative flex flex-col items-center gap-3 h-full px-4 max-w-[430px]">
        <div className="">
          <TaskScore
            score={5.55}
            maxScore={10}
            className="absolute top-7 left-35 opacity-80 blur-2xl -z-10"
          />
          <div className="absolute top-0 right-5 size-10 bg-yellow rounded-full blur-[32px] opacity-50 -z-10" />
        </div>

        <AppAvatar src={party?.logo} alt="Party Logo" className="size-7" />
        <TitleText
          text="Congratulations!"
          size="xl"
          className="text-center text-c-90"
        />
        <DescriptiveText text="Your application has been accepted." />

        <InfoCard
          icon={<FancyAgentIcon className="size-6" />}
          label="Role Assigned"
          value="Polling Unit Agent"
          variant="yellow"
          className="w-full mt-7"
        />

        <div className="mt-7 w-full space-y-3">
          <Label title="Your Polling Unit" />
          <div className="px-3 py-3 border-[1.5px] border-c-90 rounded-2xl shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex items-center gap-2">
            <PollingUnitIcon className="shrink-0 size-8" />
            <div className="">
              <p className="font-medium text-xl">Polling Unit Name</p>
              <span className="text-c-50 text-sm">
                State: Osun | LGA: EJIGBO | Ward: USUAMA
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-7">
          <Label title="What the party expects of you on Election Day." />
          <div>
            <Todo text="Ensure you are at the above Polling unit before 7AM on Election day (Jan 17)" />
            <Todo text="Complete all your election task and upload election results" />
            <Todo text="End election and request payment from party." />
          </div>
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          Close
        </Button>
      </StickyFooter>
    </div>
  );
}

export function TutorialPage({
  title,
  subtitle,
  video,
  taskNumber,
  onNextClick,
}: {
  title: "";
  subtitle: "";
  video: "";
  taskNumber: number;
  onNextClick?: () => void;
}) {
  const handleBackClick = () => {
    console.log("Go Back Clicked!");
  };

  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={handleBackClick} title={`Task ${taskNumber}`} />
      <div className="flex flex-col gap-3 h-full px-4 max-w-[430px]">
        {/* <BackgroundDesign /> */}
        <div className="space-y-2">
          <TitleText text={title} size="xl" />
          <DescriptiveText text={subtitle} size="sm" className="text-c-90" />
        </div>

        <div className="w-full pt-3">
          <video
            src={video}
            className="w-full object-contain rounded-xl ring-[1.5px] ring-c-90 shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            preload="metadata"
            playsInline
            autoPlay
            loop
            controls
          />
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          Take Quiz
        </Button>
      </StickyFooter>
    </div>
  );
}

export function TaskCompletedPage({
  score,
  maxScore,
  failedAttempts,
  note,
  onNextClick,
}: {
  score: number;
  maxScore: number;
  failedAttempts: number;
  note: string;
  onNextClick: () => void;
}) {
  const handleBackClick = () => {
    console.log("Go Back Clicked!");
  };

  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={handleBackClick} />
      <div className="relative flex flex-col gap-3 h-full px-4 max-w-[430px]">
        {/* <BackgroundDesign /> */}
        <div className="">
          <TaskScore
            score={score}
            maxScore={maxScore}
            className="absolute top-13 left-35 opacity-80 blur-2xl -z-10"
          />
          <div className="absolute top-5 right-5 size-10 bg-[#3A556A] rounded-full blur-[32px] opacity-50 -z-10" />
        </div>

        <p className="text-center text-lg text-c-50">TASK 1 SCORE</p>
        <TaskScore score={score} maxScore={maxScore} />
        {score !== maxScore && (
          <p
            className={cn(
              "text-lg font-medium text-center text-red",
              failedAttempts === 0 && "text-secondary",
            )}
          >
            You were wrong {failedAttempts} times
          </p>
        )}
        {score === maxScore && (
          <p className="text-lg font-medium text-center text-secondary">
            Perfect
          </p>
        )}

        <div className="px-5 py-3.5 rounded-xl bg-c-5 flex items-center">
          <p className="font-medium text-c-50 w-full">Cummulative Score:</p>
          <p className="font-bold text-c-80">2.5/10</p>
        </div>

        <div className="space-y-2 mt-5">
          <Label title="Key note" />

          <div className="px-5 py-3 border border-c-80 rounded-2xl bg-background shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            <p className="text-c-80 leading-6">{note}</p>
          </div>
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          Next Task
        </Button>
      </StickyFooter>
    </div>
  );
}

export function FinalScorePage({
  score,
  maxScore,
  onNextClick,
}: {
  score: number;
  maxScore: number;
  onNextClick: () => void;
}) {
  const handleBackClick = () => {
    console.log("Go Back Clicked!");
  };

  const PracticeHistoryCard = ({
    title,
    score,
    maxScore,
    date,
  }: {
    title: string;
    score: number;
    maxScore: number;
    date: string;
  }) => {
    return (
      <div className="h-12 w-full px-4 flex items-center gap-2">
        <StarIcon className="shrink-0 size-5 text-yellow" />
        <p className="w-full text-c-80">{title}</p>
        <p className="shrink-0 w-12 text-c-90 font-medium">
          {score}/{maxScore}
        </p>
        <p className="shrink-0 w-20 text-c-50 text-sm text-right">{date}</p>
      </div>
    );
  };

  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={handleBackClick} />
      <div className="relative flex flex-col gap-3 h-full px-4 max-w-[430px]">
        {/* <BackgroundDesign /> */}
        <div className="">
          <TaskScore
            score={score}
            maxScore={maxScore}
            className="absolute top-13 left-35 opacity-80 blur-2xl -z-10"
          />
          <div className="absolute top-5 right-5 size-10 bg-yellow rounded-full blur-[32px] opacity-50 -z-10" />
        </div>

        <div className="flex flex-col gap-2 items-center">
          <StarIcon className="text-yellow size-6" />
          <p className="text-center text-lg text-c-50">FINAL SCORE</p>
          <TaskScore score={score} maxScore={maxScore} />
        </div>

        <div className="space-y-3 mt-5">
          <InfoCard
            icon={<FancyMoneyBagIcon className="size-6" />}
            label="Final Score Payout"
            value="+₦365"
            variant="yellow"
            className="w-full"
          />
          <InfoCard
            icon={<FancyMoneyBagIcon className="size-6" />}
            label="Your total earnings will be paid into your bank account after you complete your duties on election day and request payout."
            variant="purple"
          />
        </div>

        <div className="space-y-2 mt-5">
          <Label title="My Performance History" />

          <div className="py-1 border border-c-80 rounded-2xl bg-background shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            <PracticeHistoryCard
              title="Practice 1"
              score={6}
              maxScore={10}
              date="Jun 14, 26"
            />
            <PracticeHistoryCard
              title="Practice 2"
              score={9.4}
              maxScore={10}
              date="Jun 14, 26"
            />
            <PracticeHistoryCard
              title="Practice 3"
              score={2.4}
              maxScore={10}
              date="Jun 14, 26"
            />
          </div>
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          Done
        </Button>
      </StickyFooter>
    </div>
  );
}

export function TaskScore({
  score,
  maxScore,
  className,
}: {
  score: number;
  maxScore: number;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-[52px] text-c-90 text-center font-extrabold",
        className,
      )}
    >
      <span className="text-purple"> {score}</span>
      <span>/{maxScore}</span>
    </h1>
  );
}

export function PracticalQuestionPage({
  title1,
  title2,
  taskNumber,
  onNextClick,
}: {
  title1: string;
  title2: string;
  taskNumber: number;
  onNextClick?: () => void;
}) {
  const handleBackClick = () => {
    console.log("Go Back Clicked!");
  };

  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={handleBackClick} title={`Task ${taskNumber}`} />
      <div className="relative flex flex-col gap-3 h-full px-4 max-w-[430px]">
        {/* <BackgroundDesign /> */}
        <div className="flex items-center justify-between text-xl text-c-50">
          <span>Practical</span>
          <span>0/10</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-[30px] text-c-90 font-extrabold">
            <span>{title1}</span>
            <span className="text-purple"> {title2}</span>
          </h1>
        </div>

        <div className="mt-5 size-20 bg-purple rounded-full blur-3xl" />

        <img
          src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1785351028/Free9ja/QmRzN4MTmLCH5RZgH6TaYgP1w5hA4GUBft2AxUhkuatMDk-Photoroom_pmhczu.webp"
          alt=""
          className="w-[300px] absolute bottom-50 right-0"
        />
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
        >
          <ArrowHandleIcon className="text-white" />
        </Button>
      </StickyFooter>
    </div>
  );
}

export function QuizPage({
  title,
  options,
  selectedOptionId,
  taskNumber,
  onGoBackClick,
  onNextClick,
  onSelectOption,
}: {
  title: string;
  options: { id: number; text: string; component: React.ReactNode }[];
  selectedOptionId: number | null;
  taskNumber: number;
  onGoBackClick?: () => void;
  onNextClick?: () => void;
  onSelectOption: (id: number) => void;
}) {
  return (
    <div className="w-full h-svh">
      <PageHeader onBackClick={onGoBackClick} title={`Task ${taskNumber}`} />
      <div className="flex flex-col gap-3 h-full px-4 max-w-[430px]">
        <TitleText text={title} size="md" />

        <div className="w-full pt-3 space-y-2">
          {options.map((option) => (
            <SelectableCard
              key={option.id}
              title={option.text}
              titleClassName="leading-6"
              rightComponent={
                <div className="shrink-0 mr-3">{option.component}</div>
              }
              isSelected={option.id === selectedOptionId}
              onClick={() => onSelectOption(option.id)}
            />
          ))}
        </div>
      </div>

      <StickyFooter className="pb-14">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={onNextClick}
          disabled={selectedOptionId === null}
        >
          Submit
        </Button>
      </StickyFooter>
    </div>
  );
}

export function BackgroundDesign() {
  return (
    <div className="absolute top-0 left-0 bg-c-primary inset-0 -z-10">
      <div>
        {/* top */}
        <TwinkleLittleStarIcon className="absolute top-10 left-4" />
        <TwinkleLittleStarIcon className="absolute top-0 right-4 rotate-12" />
        {/* bottom */}
        <TwinkleLittleStarIcon className="absolute top-116 left-16" />
        <TwinkleLittleStarIcon className="absolute top-120 right-8 rotate-45" />
      </div>
      <div>
        <NigerianFlagIcon className="absolute top-0 left-20 size-20 opacity-50 blur-[50px]" />
        <NigerianFlagIcon className="absolute top-120 left-40 size-5 blur-[16px]" />
      </div>
    </div>
  );
}

export function DashboardPage({
  tasks,
  taskType,
  onNextClick,
  onCorrect,
  onWrong,
  failedAttemptCount,
}: {
  taskType: TaskType;
  tasks: {
    arriveAtPollingUnit: boolean;
    startElection: boolean;
    endElection: boolean;
    giveUpdate: boolean;
    giveReport: boolean;
    uploadResult: boolean;
    referVoters: boolean;
  };
  onNextClick?: () => void;
  onCorrect?: () => void;
  onWrong?: () => void;
  failedAttemptCount: number;
}) {
  const navigate = useNavigate();
  const { selectedElectionGroup } = useAuth();

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

  const objectives = [
    {
      title: "Go to your polling unit & click I've arrived",
      isCompleted: tasks.arriveAtPollingUnit,
    },
    {
      title: "Enter time when election started",
      isCompleted: tasks.startElection,
    },
    {
      title: "Give updates every 30minutes (7AM - 5PM)",
      isCompleted: tasks.giveUpdate,
    },
    {
      title: "Report any issue",
      isCompleted: tasks.giveReport,
    },
    {
      title: "Upload final vote result",
      isCompleted: tasks.uploadResult,
    },
    {
      title: "Enter time when election ended",
      isCompleted: tasks.endElection,
    },
    {
      title:
        "Get voters at your polling unit to register on free9ja, indicate who they voted for. (1)",
      isCompleted: tasks.referVoters,
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

  carouselItems.push({
    title: "Elections",
    rightText: "",
  });

  if (carouselItems[carouselIndex]) {
    headerTitle = carouselItems[carouselIndex].title;
    headerRightText = carouselItems[carouselIndex].rightText;
  }

  // toast.custom((id) => <FeedbackToast type="correct" />, {
  //               position: "top-center",
  //             });

  const isThisCorrect = (type: TaskType) => {
    return taskType === type;
  };

  const hasNotArrived = taskType === "arriveAtPollingUnit";
  const hasNotStartedElection = taskType === "startElection";
  const hasNotEndedElection = taskType === "endElection";
  const haveNotToldUsIfTheyVoted = taskType === "mayHaveVoted";
  // const giveUpdate = taskType === "giveUpdate";
  // const giveReport = taskType === "giveReport";
  const hasNotUploadedResult = taskType === "uploadResult";
  const hasNotRequestedPayout = taskType === "requestPayout";
  const noVotersReffered = taskType === "referVoters";

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
                    // onClick={() => navigate({ to: "/report" })}
                  />
                ))}
                <div className="mb-2 mt-2 px-4">
                  <Button
                    type="button"
                    size="extra-large"
                    onClick={() => {
                      const isCorrect = isThisCorrect("giveReport");
                      if (!isCorrect) {
                        showFeedbackToast(false, failedAttemptCount + 1);
                        onWrong?.();
                      } else {
                        showFeedbackToast(true, failedAttemptCount);
                        const params = new URLSearchParams(
                          window.location.search,
                        );
                        params.set(
                          "failedAttemptCount",
                          String(failedAttemptCount),
                        );
                        navigate({
                          to: `/give-update?${params.toString()}`,
                        });
                      }
                    }}
                    className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
                  >
                    <ReportIcon className="w-5 h-5 shrink-0" />
                    Report
                  </Button>
                </div>
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
          length: (showObjectives ? 1 : 0) + 1,
        }).map((_, i) => (
          <CarouselDot key={i} active={carouselIndex === i} />
        ))}
      </CarouselDotContent>

      <HomeBody>
        {hasNotArrived && (
          <ArrivalCard
            onArrivedClick={() => {
              const isCorrect = isThisCorrect("arriveAtPollingUnit");
              if (!isCorrect) {
                showFeedbackToast(false, failedAttemptCount + 1);
                onWrong?.();
              } else {
                showFeedbackToast(true, failedAttemptCount);
                // In practice mode, navigate to the arrival video task with our current context
                const params = new URLSearchParams(window.location.search);
                params.set("failedAttemptCount", String(failedAttemptCount));
                navigate({
                  to: `/arrival?${params.toString()}`,
                });
              }
            }}
          />
        )}

        {hasNotStartedElection && (
          <ElectionStatusCard
            hasStarted={false}
            onStartClick={() => {
              const isCorrect = isThisCorrect("startElection");
              if (!isCorrect) {
                showFeedbackToast(false, failedAttemptCount + 1);
                onWrong?.();
              } else {
                showFeedbackToast(true, failedAttemptCount);
                const params = new URLSearchParams(window.location.search);
                params.set("failedAttemptCount", String(failedAttemptCount));
                navigate({
                  to: `/election-start?${params.toString()}`,
                });
              }
            }}
          />
        )}

        {hasNotEndedElection && (
          <ElectionStatusCard
            hasStarted={true}
            onEndClick={() => {
              const isCorrect = isThisCorrect("endElection");
              if (!isCorrect) {
                showFeedbackToast(false, failedAttemptCount + 1);
                onWrong?.();
              } else {
                showFeedbackToast(true, failedAttemptCount);
                const params = new URLSearchParams(window.location.search);
                params.set("failedAttemptCount", String(failedAttemptCount));
                navigate({
                  to: `/election-end?${params.toString()}`,
                });
              }
            }}
          />
        )}

        <DidYouVoteCard
          onYesClick={() => {
            const isCorrect = isThisCorrect("mayHaveVoted");
            if (!isCorrect) {
              showFeedbackToast(false, failedAttemptCount + 1);
              onWrong?.();
            } else {
              showFeedbackToast(true, failedAttemptCount);
              const params = new URLSearchParams(window.location.search);
              params.set("failedAttemptCount", String(failedAttemptCount));
              navigate({
                to: `/vote?${params.toString()}`,
              });
            }
          }}
          onNoClick={() => {
            const isCorrect = isThisCorrect("mayHaveVoted");
            if (!isCorrect) {
              showFeedbackToast(false, failedAttemptCount + 1);
              onWrong?.();
            } else {
              showFeedbackToast(true, failedAttemptCount);
              const params = new URLSearchParams(window.location.search);
              params.set("failedAttemptCount", String(failedAttemptCount));
              navigate({
                to: `/vote?${params.toString()}`,
              });
            }
          }}
        />

        {hasNotUploadedResult && (
          <UploadResultCard
            onClick={() => {
              const isCorrect = isThisCorrect("uploadResult");
              if (!isCorrect) {
                showFeedbackToast(false, failedAttemptCount + 1);
                onWrong?.();
              } else {
                showFeedbackToast(true, failedAttemptCount);
                const params = new URLSearchParams(window.location.search);
                params.set("failedAttemptCount", String(failedAttemptCount));
                navigate({
                  to: `/upload-result?${params.toString()}`,
                });
              }
            }}
          />
        )}

        {hasNotRequestedPayout && (
          <RequestPayoutCard
            onClick={() => {
              const isCorrect = isThisCorrect("requestPayout");
              showFeedbackToast(isCorrect, failedAttemptCount + 1);
              if (isCorrect) {
                onCorrect?.();
              } else {
                onWrong?.();
              }
            }}
          />
        )}

        {noVotersReffered && (
          <ReferralCard
            onClick={() => {
              const isCorrect = isThisCorrect("referVoters");
              showFeedbackToast(isCorrect, failedAttemptCount + 1);
              if (isCorrect) {
                onCorrect?.();
              } else {
                onWrong?.();
              }
            }}
          />
        )}

        <HomeTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          // isMock={true}
        />

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
          const isCorrect = isThisCorrect("arriveAtPollingUnit");
          if (isCorrect) {
            onCorrect?.();
          } else {
            onWrong?.();
          }
        }}
        onDismiss={() => setIsArrivalDrawerOpen(false)}
        electionDate={selectedElectionGroup?.election_date}
      />

      <GiveUpdateFloatingButton
        onClick={() => {
          const isCorrect = isThisCorrect("giveUpdate");
          if (!isCorrect) {
            showFeedbackToast(false, failedAttemptCount + 1);
            onWrong?.();
          } else {
            showFeedbackToast(true, failedAttemptCount);
            const params = new URLSearchParams(window.location.search);
            params.set("failedAttemptCount", String(failedAttemptCount));
            navigate({
              to: `/give-update?${params.toString()}`,
            });
          }
        }}
      />
    </div>
  );
}
