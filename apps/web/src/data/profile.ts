import { FEED_POSTS } from "./dashboard";

export type ProfileKind = "user" | "candidate";

export type ProfileTabId = "feed" | "about" | "votes" | "campaign";

export type ProfileData = {
  kind: ProfileKind;
  name: string;
  avatar: string;
  verified?: boolean;
  badge: { label: string; variant: "purple" | "green" };
  party?: { label: string; color: string };
  metrics?: Array<{ label: string; value: string }>;
  locationLine?: string;
  joinedLine?: string;
  bio?: string;
  highlightPill?: { left: string; right: string };
  about?: {
    text: string;
    rows: Array<{ label: string; value: string; right?: string }>;
  };
  votes?: Array<{ state: string; votes: string; rank: string }>;
  campaign?: { slogan: string; planks: Array<{ title: string; body: string }> };
  feedPostIds: string[];
};

export const PROFILE_USER: ProfileData = {
  kind: "user",
  name: "Lotta Chukwuka",
  avatar:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&h=240&fit=crop",
  verified: true,
  badge: { label: "Polling Unit Agent", variant: "purple" },
  party: { label: "PDP", color: "#2f6f57" },
  locationLine: "PU: PW Junction",
  joinedLine: "Joined May 1, 2026",
  bio: "I'm new here and ready to vote",
  about: {
    text:
      "Follower of Jesus | Also someone whose very much interested in having their vote actually count in our beautiful country called Nigeria. Sadly, the day has never come, i see it coming with the help of this app though. #free9ja",
    rows: [
      { label: "Date of birth", value: "November 25, 1946", right: "79 years" },
      { label: "Place of Origin", value: "Adamawa, Nigeria", right: "🇳🇬" },
    ],
  },
  feedPostIds: [FEED_POSTS[1]!.id, FEED_POSTS[2]!.id],
};

export const PROFILE_CANDIDATE: ProfileData = {
  kind: "candidate",
  name: "Atiku Abubakar",
  avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  verified: true,
  badge: { label: "Candidate", variant: "green" },
  party: { label: "PDP", color: "#2f6f57" },
  metrics: [
    { label: "Votes", value: "2,112,382" },
    { label: "States winning", value: "14" },
  ],
  locationLine: "PU: PW Junction",
  joinedLine: "Joined May 1, 2026",
  bio: "Former vice president of Nigeria",
  highlightPill: { left: "Currently leading #2 with", right: "603.5k votes" },
  votes: [
    { state: "Abuja", votes: "2.8m votes", rank: "#1" },
    { state: "Kaduna", votes: "2.8m votes", rank: "#2" },
    { state: "Edo", votes: "2.8m votes", rank: "#1" },
    { state: "Enugu", votes: "2.8m votes", rank: "#1" },
    { state: "Anambara", votes: "2.8m votes", rank: "#3" },
    { state: "Imo", votes: "2.8m votes", rank: "#1" },
    { state: "Cross River", votes: "2.8m votes", rank: "#1" },
    { state: "Borno", votes: "2.8m votes", rank: "#2" },
    { state: "Benin", votes: "2.8m votes", rank: "#1" },
    { state: "Abia", votes: "2.8m votes", rank: "#1" },
  ],
  campaign: {
    slogan: "Atikulated.",
    planks: [
      {
        title: "Restructuring Nigeria / True Federalism",
        body: "A modern federation that devolves power, strengthens institutions, and improves accountability at every level.",
      },
      {
        title: "Economic Growth",
        body: "Policies that attract investment, stabilize key markets, and unlock private-sector productivity nationwide.",
      },
      {
        title: "Job Creation and Poverty Reduction",
        body: "Large-scale jobs programs paired with skills training and targeted support for the most vulnerable communities.",
      },
      {
        title: "Infrastructure & Power",
        body: "Reliable electricity and strategic infrastructure upgrades to reduce costs for businesses and households.",
      },
    ],
  },
  about: {
    text: "Former vice president of Nigeria",
    rows: [
      { label: "Date of birth", value: "November 25, 1946", right: "79 years" },
      { label: "Place of Origin", value: "Adamawa, Nigeria", right: "🇳🇬" },
    ],
  },
  feedPostIds: [FEED_POSTS[0]!.id],
};

