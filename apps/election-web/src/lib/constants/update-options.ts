// Standardized offline electoral update options and taxonomy
export type StatusOption = {
  id: number;
  name: string;
  sortOrder: number;
};

export type StatusCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  sortOrder: number;
  options: StatusOption[];
};

export type IssueOption = {
  id: number;
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  sortOrder: number;
};

export type IssueCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  sortOrder: number;
  options: IssueOption[];
};

// Bundled static status categories and options for bulletproof offline usage
export const STATIC_STATUS_CATEGORIES: StatusCategory[] = [
  {
    id: 1,
    name: "Just Arrived",
    slug: "just_arrived",
    description: "Agent has physically reached the polling unit location",
    color: "sky",
    sortOrder: 1,
    options: [],
  },
  {
    id: 2,
    name: "Not Started",
    slug: "not_started",
    description: "Polling unit setup in progress or awaiting materials",
    color: "slate",
    sortOrder: 2,
    options: [
      { id: 1, name: "INEC officials arrived, setting up cubicle", sortOrder: 1 },
      { id: 2, name: "Awaiting arrival of INEC officials", sortOrder: 2 },
      { id: 3, name: "Awaiting distribution of materials from RAC", sortOrder: 3 },
      { id: 4, name: "Voter queue formation in progress", sortOrder: 4 },
      { id: 5, name: "Security personnel present at post", sortOrder: 5 },
      { id: 6, name: "Other preparation activity", sortOrder: 6 },
    ],
  },
  {
    id: 3,
    name: "Active",
    slug: "active",
    description: "Accreditation and voting actively taking place",
    color: "emerald",
    sortOrder: 3,
    options: [
      { id: 7, name: "Smooth & peaceful voting", sortOrder: 1 },
      { id: 8, name: "High voter turnout (long queues)", sortOrder: 2 },
      { id: 9, name: "Low voter turnout", sortOrder: 3 },
      { id: 10, name: "Slow BVAS accreditation", sortOrder: 4 },
      { id: 11, name: "Elderly / pregnant / PWD priority voting observed", sortOrder: 5 },
      { id: 12, name: "Other voting observation", sortOrder: 6 },
    ],
  },
  {
    id: 4,
    name: "Suspended",
    slug: "suspended",
    description: "Voting paused temporarily due to weather, device, or crowd issues",
    color: "amber",
    sortOrder: 4,
    options: [
      { id: 13, name: "Awaiting BVAS technician or replacement device", sortOrder: 1 },
      { id: 14, name: "Awaiting ballot paper or material resupply", sortOrder: 2 },
      { id: 15, name: "Suspended due to rain or adverse weather", sortOrder: 3 },
      { id: 16, name: "Temporary pause to restore crowd order on queue", sortOrder: 4 },
      { id: 17, name: "Other suspension reason", sortOrder: 5 },
    ],
  },
  {
    id: 5,
    name: "Disrupted",
    slug: "disrupted",
    description: "Critical incident, violence, or security interruption",
    color: "red",
    sortOrder: 5,
    options: [
      { id: 18, name: "Voting halted due to violence or security threat", sortOrder: 1 },
      { id: 19, name: "Polling unit dispersed by crowd or hoodlums", sortOrder: 2 },
      { id: 20, name: "INEC ad-hoc officials evacuated from premises", sortOrder: 3 },
      { id: 21, name: "Polling unit shut down by security agencies", sortOrder: 4 },
      { id: 22, name: "Other disruption incident", sortOrder: 5 },
    ],
  },
  {
    id: 6,
    name: "Concluded",
    slug: "concluded",
    description: "Queue officially closed; voting finished for all voters",
    color: "blue",
    sortOrder: 6,
    options: [
      { id: 23, name: "Queue closed peacefully at cutoff time", sortOrder: 1 },
      { id: 24, name: "Last voter in queue cast ballot", sortOrder: 2 },
      { id: 25, name: "Unused ballots cancelled and stamped", sortOrder: 3 },
      { id: 26, name: "Other conclusion note", sortOrder: 4 },
    ],
  },
  {
    id: 7,
    name: "Counting & Sorting",
    slug: "counting_sorting",
    description: "Ballot boxes opened; sorting and public counting underway",
    color: "purple",
    sortOrder: 7,
    options: [
      { id: 27, name: "Public sorting of ballots by party underway", sortOrder: 1 },
      { id: 28, name: "Public counting and ballot tallying", sortOrder: 2 },
      { id: 29, name: "Contested or rejected ballots dispute", sortOrder: 3 },
      { id: 30, name: "Counting in darkness (no floodlights or lamps)", sortOrder: 4 },
      { id: 31, name: "Other counting observation", sortOrder: 5 },
    ],
  },
  {
    id: 8,
    name: "Results Declared",
    slug: "results_declared",
    description: "Official EC8A result announced, signed, and pasted",
    color: "teal",
    sortOrder: 8,
    options: [
      { id: 32, name: "EC8A form filled and signed by party agents", sortOrder: 1 },
      { id: 33, name: "EC8A pasted on wall for public view", sortOrder: 2 },
      { id: 34, name: "Result transmitted via BVAS / IReV", sortOrder: 3 },
      { id: 35, name: "INEC officials issued duplicate EC8A copies to all party agents", sortOrder: 4 },
      { id: 36, name: "Other declaration detail", sortOrder: 5 },
    ],
  },
];

// Bundled static issue categories and options for bulletproof offline usage
export const STATIC_ISSUE_CATEGORIES: IssueCategory[] = [
  {
    id: 1,
    name: "Security & Violence",
    slug: "violence",
    description: "Threats, physical altercations, intimidation, armed presence, or disruptions",
    color: "red",
    sortOrder: 1,
    options: [
      { id: 1, name: "Inec officials are running", severity: "critical", sortOrder: 1 },
      { id: 2, name: "Ballot box snatching or destruction", severity: "critical", sortOrder: 2 },
      { id: 3, name: "Thugs disrupting voting", severity: "critical", sortOrder: 3 },
      { id: 4, name: "Voter intimidation or harassment", severity: "high", sortOrder: 4 },
      { id: 5, name: "Men in police or military uniform interfering", severity: "critical", sortOrder: 5 },
      { id: 6, name: "Security personnel absent or compromised", severity: "high", sortOrder: 6 },
      { id: 7, name: "Other security incident", severity: "medium", sortOrder: 7 },
    ],
  },
  {
    id: 2,
    name: "Technical & BVAS",
    slug: "technical",
    description: "BVAS biometric accreditation failures, hardware defects, or connectivity downtime",
    color: "amber",
    sortOrder: 2,
    options: [
      { id: 8, name: "BVAS machine malfunction or battery dead", severity: "high", sortOrder: 1 },
      { id: 9, name: "BVAS network / server transmission failure", severity: "high", sortOrder: 2 },
      { id: 10, name: "BVAS failing fingerprint and facial recognition", severity: "high", sortOrder: 3 },
      { id: 11, name: "Other technical equipment failure", severity: "medium", sortOrder: 4 },
    ],
  },
  {
    id: 3,
    name: "Logistics & Materials",
    slug: "logistics",
    description: "Delayed arrival of staff, ballot shortages, or missing election sensitive materials",
    color: "orange",
    sortOrder: 3,
    options: [
      { id: 12, name: "Late arrival of electoral materials", severity: "medium", sortOrder: 1 },
      { id: 13, name: "Shortage of ballot papers", severity: "high", sortOrder: 2 },
      { id: 14, name: "Missing result sheets (EC8A)", severity: "critical", sortOrder: 3 },
      { id: 15, name: "Polling unit relocated illegally", severity: "high", sortOrder: 4 },
      { id: 16, name: "Other logistical challenge", severity: "medium", sortOrder: 5 },
    ],
  },
  {
    id: 4,
    name: "Electoral Malpractice",
    slug: "malpractice",
    description: "Vote buying, underage voting, result manipulation, or procedural infractions",
    color: "purple",
    sortOrder: 4,
    options: [
      { id: 17, name: "Vote buying or selling observed", severity: "high", sortOrder: 1 },
      { id: 18, name: "Eligible voters prevented from voting", severity: "critical", sortOrder: 2 },
      { id: 19, name: "Underage voting observed", severity: "high", sortOrder: 3 },
      { id: 20, name: "Multiple voting or ballot stuffing", severity: "critical", sortOrder: 4 },
      { id: 21, name: "Result falsification attempt", severity: "critical", sortOrder: 5 },
      { id: 22, name: "Party agents denied access or forced away", severity: "high", sortOrder: 6 },
      { id: 23, name: "INEC presiding officer refused agent copy of EC8A", severity: "critical", sortOrder: 7 },
      { id: 24, name: "Other electoral malpractice", severity: "medium", sortOrder: 8 },
    ],
  },
];
