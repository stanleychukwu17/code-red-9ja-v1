export const CANDIDATES = [
  {
    name: "Atiku Abubakar",
    states: "8 states",
    votes: "4.9m votes",
    rank: "#1",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Peter Obi",
    states: "4 states",
    votes: "4.7m votes",
    rank: "#2",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Bola Tinubu",
    states: "5 states",
    votes: "3.8m votes",
    rank: "#3",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    name: "Rabiu Kwankwaso",
    states: "8 states",
    votes: "900.2k votes",
    rank: "#4",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    name: "Christopher Imumolen",
    states: "8 states",
    votes: "900.2k votes",
    rank: "#5",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    name: "Hamza al-Mustapha",
    states: "8 states",
    votes: "900.2k votes",
    rank: "#6",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
  },
  {
    name: "Yabagi Sani",
    states: "8 states",
    votes: "900.2k votes",
    rank: "#7",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop",
  },
  {
    name: "Osita Nnadi",
    states: "8 states",
    votes: "900.2k votes",
    rank: "#8",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  },
] as const;

export const DASHBOARD_STATE_RANKINGS: ReadonlyArray<{
  name: string;
  votes: string;
  rank: string;
  image: string;
  highlighted?: boolean;
}> = [
  {
    name: "Lagos",
    votes: "2.2m votes",
    rank: "#3",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
    highlighted: true,
  },
  {
    name: "Abuja",
    votes: "2.8m votes",
    rank: "#1",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Kaduna",
    votes: "2.51m votes",
    rank: "#2",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    name: "Gombe",
    votes: "2.5m votes",
    rank: "#2",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Enugu",
    votes: "2.5m votes",
    rank: "#2",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
] as const;

export const STATES_PAGE_ROWS = [
  {
    name: "Abuja",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    name: "Kaduna",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Edo",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Enugu",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Anambara",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Imo",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    name: "Cross River",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Borno",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Benin",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Abia",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Adamawa",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Ebonyi",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Bauchi",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Ogun",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Jos",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Delta",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
] as const;

export const APP_USERS_SUMMARY: ReadonlyArray<{
  label: string;
  value: string;
  accent?: boolean;
}> = [
  { label: "Total online users", value: "4,608,908", accent: true },
  { label: "Home (Inside Nigeria)", value: "1,502,891" },
  { label: "Diaspora (Outside Nigeria)", value: "3,147,910" },
] as const;

export const APP_USERS_HOME_ROWS = [
  "FCT (Abuja)",
  "Abia",
  "Adamawa",
  "Anambara",
  "Bauchi",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
] as const;

export const APP_USERS_DIASPORA_ROWS = [
  { flag: "US", name: "United States" },
  { flag: "CA", name: "Canada" },
  { flag: "GB", name: "United Kingdom" },
  { flag: "AU", name: "Australia" },
  { flag: "TR", name: "Turkey" },
  { flag: "CY", name: "Cyprus" },
  { flag: "IL", name: "Israel" },
  { flag: "ZA", name: "South Africa" },
  { flag: "RU", name: "Russia" },
] as const;

export const POLLING_UNIT_VOTE_ROWS = [
  {
    name: "Atiku Abubakar",
    votes: "203 votes",
    rank: "#1",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Peter Obi",
    votes: "166 votes",
    rank: "#2",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Bola Tinubu",
    votes: "173 votes",
    rank: "#3",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    name: "Rabiu Kwankwaso",
    votes: "82 votes",
    rank: "#4",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    name: "Christopher Imumolen",
    votes: "23 votes",
    rank: "#5",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    name: "Hamza al-Mustapha",
    votes: "21 votes",
    rank: "#6",
    image:
      "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=200&h=200&fit=crop",
  },
  {
    name: "Yabagi Sani",
    votes: "15 votes",
    rank: "#7",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop",
  },
  {
    name: "Osita Nnadi",
    votes: "9 votes",
    rank: "#8",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
  },
] as const;

export const POLLING_UNIT_FEED_POSTS: ReadonlyArray<{
  id: string;
  author: string;
  meta: string;
  avatar: string;
  content: string;
  image?: string;
  likes: string;
  comments: string;
  accent?: "report" | "situation";
}> = [
  {
    id: "polling-unit-feed-1",
    author: "Nathan Bwala",
    meta: "KOFAR FADA...",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    content:
      "Got to my polling unit by 7:10am and the queue is already long. People are determined this time. Let's do this.",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=900&fit=crop",
    likes: "1.2k",
    comments: "178",
  },
  {
    id: "polling-unit-feed-2",
    author: "Aisha Yusuf",
    meta: "Jefabo",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    content:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    likes: "71",
    comments: "12",
  },
] as const;

export const POLLING_UNIT_REPORT_POSTS: ReadonlyArray<{
  id: string;
  author: string;
  meta: string;
  avatar: string;
  content: string;
  image?: string;
  likes: string;
  comments: string;
  accent?: "report" | "situation";
}> = [
  {
    id: "polling-unit-report-1",
    author: "Dan Joffery",
    meta: "3h",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    content:
      "We currently have multiple voting and impersonation of voters taking place here. Free9ja please do something.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=900&fit=crop",
    likes: "1.2k",
    comments: "178",
    accent: "report",
  },
  {
    id: "polling-unit-report-2",
    author: "Salima Alima",
    meta: "3h",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    content:
      "This polling unit agents are acting very suspicious. One is at the back behaving very funny.",
    likes: "71",
    comments: "12",
    accent: "report",
  },
] as const;

export const POLLING_UNIT_SITUATION_POSTS: ReadonlyArray<{
  id: string;
  author: string;
  meta: string;
  avatar: string;
  content: string;
  image?: string;
  likes: string;
  comments: string;
  accent?: "report" | "situation";
}> = [
  {
    id: "polling-unit-situation-1",
    author: "James Ugona",
    meta: "8:23 AM . Jan 19",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    content:
      "Polling unit officers are yet to arrive over here. I hope this is not one of their tactics.",
    likes: "71",
    comments: "12",
    accent: "situation",
  },
  {
    id: "polling-unit-situation-2",
    author: "James Ugona",
    meta: "8:57 AM . Jan 19",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    content: "Election just started, and voting has started.",
    likes: "53",
    comments: "8",
    accent: "situation",
  },
] as const;

export const POLLING_UNIT_VOTER_UPLOADS = [
  {
    id: "voter-upload-1",
    author: "James Ugona",
    timestamp: "5:23 PM . Jan 19",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&h=1600&fit=crop",
  },
  {
    id: "voter-upload-2",
    author: "Larry Elvis",
    timestamp: "5:48 PM . Jan 19",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=1600&fit=crop",
  },
] as const;

export const POLLING_UNIT_INEC_UPLOAD = {
  author: "INEC",
  timestamp: "8:23 AM . Jan 21",
  avatar:
    "https://www.womenconsortiumofnigeria.org/sites/default/files/styles/pageimage/public/field/image/inec.jpg?itok=MJJlmFxo",
  image:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&h=1600&fit=crop",
} as const;

export const POLLING_UNIT_ACTIVITIES = [
  {
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    actor: "Gozie Nwosu",
    action: "uploaded vote result",
    time: "8:49 PM, Jan 19",
    accent: "default",
  },
  {
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    actor: "Esther",
    action: "uploaded vote result",
    time: "7:15 PM, Jan 19",
    accent: "default",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    actor: "James Ugona",
    action: "posted a situation report",
    time: "3:07 PM, Jan 19",
    accent: "info",
  },
  {
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop",
    actor: "Jennifer Omale",
    action: "uploaded vote result",
    time: "3:01 PM, Jan 19",
    accent: "default",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    actor: "James Ugona",
    action: "posted a situation report",
    time: "2:11 PM, Jan 19",
    accent: "info",
  },
  {
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    actor: "Clement Boye",
    action: "reported this polling unit",
    time: "1:07 PM, Jan 19",
    accent: "danger",
  },
] as const;

export const STATE_POLLING_UNITS = [
  "KOFAR FADA DOKA",
  "MARBINI DISPENSARY",
  "OPEN SPACE TENBIRI",
  "TSE ATIM JUNCTION",
  "NEAR DOCTOR KUNDE",
  "INFRONT OF GARDEN OF GLORY",
  "OPP. APOSTOLIC NUR./PRI. SCHOOL, ...",
  "MUSA VILLAGE",
  "JOSEPH TION IYO STREET - NEAR JOSEPH TION IYO HO...",
  "AKER - SULE (NEAR)",
  "BELTA OPEN SPACE 4 DELTA STREET ...",
] as const;

export const FEED_POSTS: ReadonlyArray<{
  id: string;
  author: string;
  meta: string;
  timestamp: string;
  content: string;
  likes: string;
  comments: string;
  avatar: string;
  image?: string;
}> = [
  {
    id: "nathan-bwala",
    author: "Nathan Bwala",
    meta: "KOFAR FADA...",
    timestamp: "8:20 AM, July 2026",
    content:
      "Got to my polling unit by 7:10am and the queue is already long. People are determined this time. Let's do this.",
    likes: "1.2k",
    comments: "178",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=900&fit=crop",
  },
  {
    id: "aisha-yusuf",
    author: "Aisha Yusuf",
    meta: "Jefabo",
    timestamp: "9:31 PM, Jan 23",
    content:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    likes: "71",
    comments: "12",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  },
  {
    id: "jessica-faith",
    author: "Jessica Faith",
    meta: "PU 014",
    timestamp: "7:10 AM, Jan 23",
    content:
      "INEC officials still not here at PU 014, we've been waiting since 8am.",
    likes: "35",
    comments: "7",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=900&fit=crop",
  },
  {
    id: "benson-ijebuode",
    author: "Benson Ijebuode",
    meta: "Jefabo",
    timestamp: "5:48 PM, Jan 23",
    content:
      "Just voted for the first time in my life! Feels good to finally have a say in Nigeria's future.",
    likes: "22",
    comments: "5",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
] as const;

export const POST_COMMENTS = [
  {
    id: "comment-1",
    author: "Aisha Yusuf",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    timestamp: "9:31PM, Jan 23",
    content:
      "We really are determined sir. All we've ever wanted was a free and fair election. Now we have it, is that too much to ask for as citizens of Nigeria.",
    likes: "71",
  },
  {
    id: "comment-2",
    author: "Aisha Yusuf",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    timestamp: "9:31PM, Jan 23",
    content: "Hahaha.",
    likes: "2",
  },
] as const;

export const SEARCH_PEOPLE_RESULTS = [
  {
    type: "People",
    name: "Emeka Eze",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Zainab Bello",
    subtitle: "PW Junction",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Sadiq Lawal",
    subtitle: "KOFAR FADA DOKA",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Fatima Sani",
    subtitle: "Area 1 Open Space",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Ngozi Obi",
    subtitle: "Wuse Primary School",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Tunde Balogun",
    subtitle: "Jabi Market Square",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Obinna Nwosu",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Atiku Abubakar",
    subtitle: "Candidate . Asokoro INEC HQ",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    type: "People",
    name: "Ifeoma Nwankwo",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Chinedu Okafor",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Adebayo Ogunleye",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Musa Abdullahi",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
  },
  {
    type: "People",
    name: "Olumide Adeyemi",
    subtitle: "NYSC Camp Junction",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  },
] as const;

export const SEARCH_POLLING_UNIT_RESULTS = [
  {
    type: "Polling Unit",
    name: "PW Junction",
    subtitle: "Abuja",
    state: "Abuja",
    unit: "PW Junction",
    votes: "302 votes",
  },
  {
    type: "Polling Unit",
    name: "KOFAR FADA DOKA",
    subtitle: "Lagos",
    state: "Lagos",
    unit: "KOFAR FADA DOKA",
    votes: "302 votes",
  },
  {
    type: "Polling Unit",
    name: "Area 1 Open Space",
    subtitle: "Abuja",
    state: "Abuja",
    unit: "Area 1 Open Space",
    votes: "281 votes",
  },
  {
    type: "Polling Unit",
    name: "Wuse Primary School",
    subtitle: "Abuja",
    state: "Abuja",
    unit: "Wuse Primary School",
    votes: "249 votes",
  },
  {
    type: "Polling Unit",
    name: "Jabi Market Square",
    subtitle: "Kaduna",
    state: "Kaduna",
    unit: "Jabi Market Square",
    votes: "198 votes",
  },
] as const;

export const SEARCH_STATE_RESULTS = [
  {
    type: "State",
    name: "Lagos",
    subtitle: "Presidential result",
    votes: "2.2m votes",
    rank: "#3",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    type: "State",
    name: "Abuja",
    subtitle: "Presidential result",
    votes: "2.8m votes",
    rank: "#1",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    type: "State",
    name: "Kaduna",
    subtitle: "Presidential result",
    votes: "2.5m votes",
    rank: "#2",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
  {
    type: "State",
    name: "Enugu",
    subtitle: "Presidential result",
    votes: "1.9m votes",
    rank: "#4",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
] as const;
