import PlusIcon from "@repo/ui/icons/plus-icon";
import ReportIcon from "@repo/ui/icons/report-icon";
import { cn } from "@repo/ui/lib/utils";

function SmallyButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[29px] px-2 rounded-lg bg-secondary flex items-center gap-0.5 text-xs text-black",
        className,
      )}
    >
      {children}
    </div>
  );
}

const ArrivedAtPollingUnitSmallyButton = () => (
  <SmallyButton>I've arrived</SmallyButton>
);

const ReferralCodeSmallyButton = () => (
  <SmallyButton className="border border-c-90 bg-background text-c-80">
    Referral Code
  </SmallyButton>
);
const StartElectionSmallyButton = () => (
  <SmallyButton>Yes, it has started</SmallyButton>
);

const EndElectionSmallyButton = () => (
  <SmallyButton>Yes, it has ended</SmallyButton>
);

const VotedSmallyButton = () => <SmallyButton>Yes</SmallyButton>;

const UploadResultSmallyButton = () => (
  <SmallyButton className="bg-purple text-white">Upload Result</SmallyButton>
);

const GiveUpdateSmallyButton = () => (
  <SmallyButton className="size-7 rounded-full">
    <PlusIcon className="size-4 text-black/50" strokeWidth={3} />
  </SmallyButton>
);

const RequestPayoutSmallyButton = () => (
  <SmallyButton className="bg-black text-white">Request Payout</SmallyButton>
);

const ReportIssueSmallyButton = () => (
  <SmallyButton className="bg-[#555555] text-white">
    <div className="flex">
      <div className="mb-1">
        <ReportIcon className="size-4" />
      </div>
      <p className="mt-0.5">Report</p>
    </div>
  </SmallyButton>
);

export type TaskType =
  | "arriveAtPollingUnit"
  | "startElection"
  | "endElection"
  | "giveUpdate"
  | "giveReport"
  | "uploadResult"
  | "mayHaveVoted"
  | "referVoters"
  | "requestPayout";

export type PracticeTaskType = {
  id: number;
  tutorial: {
    title: string;
    subtitle: string;
    video: string;
  };
  quiz: {
    title: string;
    correctOptionId: number;
    options: {
      id: number;
      text: string;
      component: React.ReactNode;
    }[];
  };
  practical: {
    title1: string;
    title2: string;
    taskType: TaskType;
  };
  note: string;
};

const allOptions = [
  {
    id: 1,
    text: "I will report",
    component: <ReportIssueSmallyButton />,
  },
  {
    id: 2,
    text: "I will give updates",
    component: <GiveUpdateSmallyButton />,
  },
  {
    id: 3,
    text: "I will collect and upload election result",
    component: <UploadResultSmallyButton />,
  },
  {
    id: 4,
    text: "I will tell my party that I've arrived at my polling unit",
    component: <ArrivedAtPollingUnitSmallyButton />,
  },
  {
    id: 5,
    text: "I will tell my party when election started",
    component: <StartElectionSmallyButton />,
  },
  {
    id: 6,
    text: "I will tell my party when election ended",
    component: <EndElectionSmallyButton />,
  },
  {
    id: 7,
    text: "I will indicate who I voted for",
    component: <VotedSmallyButton />,
  },
  {
    id: 8,
    text: "I will tell them to register and use my referral code",
    component: <ReferralCodeSmallyButton />,
  },
  {
    id: 9,
    text: "I will request payout",
    component: <RequestPayoutSmallyButton />,
  },
];

export const getRandomOptions = (
  correctOptionId: number,
  limit: number = 4,
) => {
  const correctOption = allOptions.find((opt) => opt.id === correctOptionId);
  const otherOptions = allOptions.filter((opt) => opt.id !== correctOptionId);

  const shuffledOthers = [...otherOptions].sort(() => 0.5 - Math.random());
  const selectedOthers = shuffledOthers.slice(0, limit - 1);

  const finalOptions = [correctOption!, ...selectedOthers].sort(
    () => 0.5 - Math.random(),
  );

  return finalOptions;
};

export const pollingAgentTest: PracticeTaskType[] = [
  {
    id: 1,
    tutorial: {
      title: "Arrival at Polling Unit",
      subtitle:
        "When you arrive at your polling unit, Upload a picture and video evidence.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title: "When you arrive at your polling unit around 7am, what do you do?",
      correctOptionId: 4,
      options: getRandomOptions(4, 4),
    },
    practical: {
      title1: "You Just arrived at your polling unit on election day.",
      title2: "Show us what you will do?",
      taskType: "arriveAtPollingUnit",
    },
    note: "Ensure to arrive at your polling unit before 7AM, to make the most amount of money possible.",
  },
  {
    id: 2,
    tutorial: {
      title: "Start Election",
      subtitle:
        "When election starts at your polling unit. Tell your party when it started and upload video evidence.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title: "When election starts at your polling unit, what do you do?",
      correctOptionId: 5,
      options: getRandomOptions(5, 4),
    },
    practical: {
      title1: "Election just started at your polling unit.",
      title2: "Show us what you will do?",
      taskType: "startElection",
    },
    note: "On election day ensure you tell your party when exactly election started, and upload video evidence.",
  },
  {
    id: 3,
    tutorial: {
      title: "Give Party Updates",
      subtitle:
        "Give party updates every frequently telling them how election is going at your polling unit.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "Every 30 minutes your party wants to know how election is going at your polling unit, what do you do?",
      correctOptionId: 2,
      options: getRandomOptions(2, 4),
    },
    practical: {
      title1:
        "30 minutes just went by, your party don’t know what’s happening at your polling unit.",
      title2: "Show us what you will do?",
      taskType: "giveUpdate",
    },
    note: "Make sure that on election day, you give regular updates about the election to your party every 30 minutes to keep them informed on everything.",
  },
  {
    id: 4,
    tutorial: {
      title: "Report Irregularities",
      subtitle:
        "Report any irregularity you notice at your polling unit such as vote buying, ballot box snatching, multiple voting etc.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "Whenever something illegal is taking place at your polling unit, what do you do?",
      correctOptionId: 1,
      options: getRandomOptions(1, 4),
    },
    practical: {
      title1: "You just saw someone buying votes at your polling unit.",
      title2: "Show us what you will do?",
      taskType: "giveReport",
    },
    note: "Ensure to report irregularities such as vote buying, ballot box snatching, multiple voting etc. on election day.",
  },
  {
    id: 5,
    tutorial: {
      title: "Indicate who you voted for",
      subtitle: "Only if you voted at your party assigned polling unit",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "You just finished voting at your polling unit of assignment, what do you do next?",
      correctOptionId: 7,
      options: getRandomOptions(7, 4),
    },
    practical: {
      title1: "You just voted at your assigned polling unit.",
      title2: "Show us what you will do?",
      taskType: "mayHaveVoted",
    },
    note: "Ensure to indicate who you voted for (or not) after voting at your assigned polling unit.",
  },
  {
    id: 6,
    tutorial: {
      title: "Upload Election Result",
      subtitle:
        "After election is over and votes have been counted and recorded on the result sheet, get the collated result sheet and take picture and video evidences and upload.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "After election ends at your polling unit and all votes are counted and recorded, what do you do?",
      correctOptionId: 3,
      options: getRandomOptions(3, 4),
    },
    practical: {
      title1: "The election has ended and votes have been counted.",
      title2: "Show us what you will do after collecting the result sheets?",
      taskType: "uploadResult",
    },
    note: "Ensure to get the collated result sheet and take picture and video evidences of and upload. If possible get the INEC staff to give you your own copy for further verification",
  },
  {
    id: 7,
    tutorial: {
      title: "End Election",
      subtitle:
        "When election ends at your polling unit. Ensure you indicate the time it ended and upload video evidence.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "After election ends and you upload all election results, what do you do next?",
      correctOptionId: 6,
      options: getRandomOptions(6, 4),
    },
    practical: {
      title1: "The election has ended and your party is yet to know.",
      title2: "Show us what you will do?",
      taskType: "endElection",
    },
    note: "Ensure to update your party on when election ends at your polling unit",
  },
  {
    id: 8,
    tutorial: {
      title: "Tell people to register on Free9ja and make more money",
      subtitle:
        "Tell people before and on election day to register on Free9ja (using your referral code) and indicate who they voted for.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "To get people to register on Free9ja and make more money doing so, what do you do?",
      correctOptionId: 8,
      options: getRandomOptions(8, 4),
    },
    practical: {
      title1:
        "Your friends and family start registering on Free9ja, but they don't know your referral code.",
      title2: "Tap the button showing your referral code?",
      taskType: "referVoters",
    },
    note: "Make sure to tell your friends, family, and others to register on Free9ja (using your referral code) and indicate who they voted for after voting on election day. This constitutes 20% of your payment.",
  },
  {
    id: 9,
    tutorial: {
      title: "Request Payment from Party",
      subtitle:
        "After completion of all your tasks on election day, request for payment.",
      video:
        "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4",
    },
    quiz: {
      title:
        "After you complete all your election day tasks and you want your payment sent to you, what do you do?",
      correctOptionId: 9,
      options: getRandomOptions(9, 4),
    },
    practical: {
      title1: "You want your money paid to you.",
      title2: "Show us what you will do?",
      taskType: "requestPayout",
    },
    note: "Ensure to request for your payment after you've successfully completed all your tasks on election day. Your work will be reviewed and if found satisfactory, your total earnings will be disbursed to you. Your total earnings is dependent on your performance as an agent.",
  },
];
