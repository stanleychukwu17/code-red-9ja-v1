// Standardized offline electoral update options and taxonomy
export type StatusOption = {
  id: number;
  name: string;
  sortOrder: number;
};

export type StatusCategory = {
  id: number;
  forWho?: "agent" | "supervisor";
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
  forWho?: "agent" | "supervisor";
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
  {
    id: 9,
    forWho: "supervisor",
    name: "Collation Centre",
    slug: "collation_centre",
    description: "RAC or Collation Centre activities",
    color: "purple",
    sortOrder: 10,
    options: [
      { id: 37, name: "Arrived at Collation Centre", sortOrder: 1 },
      { id: 38, name: "Receiving PU Results (EC8A)", sortOrder: 2 },
      { id: 39, name: "Collation In Progress", sortOrder: 3 },
      { id: 40, name: "Result Disputed / Objections", sortOrder: 4 },
      { id: 41, name: "Collation Concluded (EC8B/C Signed)", sortOrder: 5 },
      { id: 42, name: "Other collation update", sortOrder: 6 },
    ],
  },
  {
    id: 10,
    forWho: "supervisor",
    name: "Field Monitoring",
    slug: "field_monitoring",
    description: "General inspection across polling units",
    color: "blue",
    sortOrder: 11,
    options: [
      { id: 43, name: "Routine PU Inspection", sortOrder: 1 },
      { id: 44, name: "Low Voter Turnout / Quiet", sortOrder: 2 },
      { id: 45, name: "Smooth Voting Process", sortOrder: 3 },
      { id: 46, name: "Agent Support / Replacement", sortOrder: 4 },
      { id: 47, name: "Other field observation", sortOrder: 5 },
    ],
  },
  {
    id: 11,
    forWho: "supervisor",
    name: "Logistics",
    slug: "logistics",
    description: "Material shortages, BVAS, or deployment",
    color: "amber",
    sortOrder: 12,
    options: [
      { id: 48, name: "Material Shortage (Ballots, EC8A)", sortOrder: 1 },
      { id: 49, name: "Widespread BVAS Device Failure", sortOrder: 2 },
      { id: 50, name: "Late Arrival of INEC Officials", sortOrder: 3 },
      { id: 51, name: "Other logistics issue", sortOrder: 4 },
    ],
  },
  {
    id: 12,
    forWho: "supervisor",
    name: "Security",
    slug: "security",
    description: "Violence, intimidation, or disruptions",
    color: "red",
    sortOrder: 13,
    options: [
      { id: 52, name: "Violence / Thuggery", sortOrder: 1 },
      { id: 53, name: "Ballot / BVAS Snatching", sortOrder: 2 },
      { id: 54, name: "Voter / Agent Intimidation", sortOrder: 3 },
      { id: 55, name: "Other security incident", sortOrder: 4 },
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
      { id: 1, name: "Inec officials are running", severity: "critical", sortOrder: 1, forWho: "agent" },
      { id: 2, name: "Ballot box snatching or destruction", severity: "critical", sortOrder: 2, forWho: "agent" },
      { id: 3, name: "Thugs disrupting voting", severity: "critical", sortOrder: 3, forWho: "agent" },
      { id: 4, name: "Voter intimidation or harassment", severity: "high", sortOrder: 4, forWho: "agent" },
      { id: 5, name: "Men in police or military uniform interfering", severity: "critical", sortOrder: 5, forWho: "agent" },
      { id: 6, name: "Security personnel absent or compromised", severity: "high", sortOrder: 6, forWho: "agent" },
      { id: 7, name: "Other security incident", severity: "medium", sortOrder: 7, forWho: "agent" },
      { id: 25, name: "Violence or thuggery at collation centre", severity: "critical", sortOrder: 10, forWho: "supervisor" },
      { id: 26, name: "Security interference or intimidation during collation", severity: "critical", sortOrder: 11, forWho: "supervisor" },
      { id: 27, name: "Security personnel absent at collation centre", severity: "high", sortOrder: 12, forWho: "supervisor" },
      { id: 28, name: "Other supervisor security incident", severity: "medium", sortOrder: 13, forWho: "supervisor" },
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
      { id: 8, name: "BVAS machine malfunction or battery dead", severity: "high", sortOrder: 1, forWho: "agent" },
      { id: 9, name: "BVAS network / server transmission failure", severity: "high", sortOrder: 2, forWho: "agent" },
      { id: 10, name: "BVAS failing fingerprint and facial recognition", severity: "high", sortOrder: 3, forWho: "agent" },
      { id: 11, name: "Other technical equipment failure", severity: "medium", sortOrder: 4, forWho: "agent" },
      { id: 29, name: "Widespread BVAS failure across multiple polling units", severity: "critical", sortOrder: 10, forWho: "supervisor" },
      { id: 30, name: "IReV / result transmission failure at collation", severity: "high", sortOrder: 11, forWho: "supervisor" },
      { id: 31, name: "Other technical issue", severity: "medium", sortOrder: 12, forWho: "supervisor" },
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
      { id: 12, name: "Late arrival of electoral materials", severity: "medium", sortOrder: 1, forWho: "agent" },
      { id: 13, name: "Shortage of ballot papers", severity: "high", sortOrder: 2, forWho: "agent" },
      { id: 14, name: "Missing result sheets (EC8A)", severity: "critical", sortOrder: 3, forWho: "agent" },
      { id: 15, name: "Polling unit relocated illegally", severity: "high", sortOrder: 4, forWho: "agent" },
      { id: 16, name: "Other logistical challenge", severity: "medium", sortOrder: 5, forWho: "agent" },
      { id: 32, name: "Delayed distribution of sensitive materials from RAC", severity: "high", sortOrder: 10, forWho: "supervisor" },
      { id: 33, name: "Collation delayed or suspended without reason", severity: "high", sortOrder: 11, forWho: "supervisor" },
      { id: 34, name: "Polling agent absent / unreachable at polling unit", severity: "high", sortOrder: 12, forWho: "supervisor" },
      { id: 35, name: "Other supervisor logistics issue", severity: "medium", sortOrder: 13, forWho: "supervisor" },
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
      { id: 17, name: "Vote buying or selling observed", severity: "high", sortOrder: 1, forWho: "agent" },
      { id: 18, name: "Eligible voters prevented from voting", severity: "critical", sortOrder: 2, forWho: "agent" },
      { id: 19, name: "Underage voting observed", severity: "high", sortOrder: 3, forWho: "agent" },
      { id: 20, name: "Multiple voting or ballot stuffing", severity: "critical", sortOrder: 4, forWho: "agent" },
      { id: 21, name: "Result falsification attempt", severity: "critical", sortOrder: 5, forWho: "agent" },
      { id: 22, name: "Party agents denied access or forced away", severity: "high", sortOrder: 6, forWho: "agent" },
      { id: 23, name: "INEC presiding officer refused agent copy of EC8A", severity: "critical", sortOrder: 7, forWho: "agent" },
      { id: 24, name: "Other electoral malpractice", severity: "medium", sortOrder: 8, forWho: "agent" },
      { id: 36, name: "Missing or altered EC8B / EC8C / EC8E collation sheet", severity: "critical", sortOrder: 10, forWho: "supervisor" },
      { id: 37, name: "Result falsification or figure alteration at collation", severity: "critical", sortOrder: 11, forWho: "supervisor" },
      { id: 38, name: "Party supervisors / agents denied access to collation centre", severity: "high", sortOrder: 12, forWho: "supervisor" },
      { id: 39, name: "INEC collation officer refused duplicate EC8B / EC8C / EC8E copy", severity: "critical", sortOrder: 13, forWho: "supervisor" },
      { id: 40, name: "Other collation malpractice", severity: "medium", sortOrder: 14, forWho: "supervisor" },
    ],
  },
];
