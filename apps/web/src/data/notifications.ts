export type NotificationItem = {
  id: string;
  actorName: string;
  actorAvatar: string;
  text: string;
  timestampLabel: string;
  group: "Today" | "Yesterday";
  unread?: boolean;
};

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-kennedy-1",
    actorName: "Kennedy Musa",
    actorAvatar:
      "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg",
    text: `Commented on your post saying "I don’t know where this thugs come from".`,
    timestampLabel: "2h",
    group: "Today",
    unread: true,
  },
  {
    id: "n-jerry-1",
    actorName: "Jerry Eze",
    actorAvatar:
      "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/3_v3qkch.jpg",
    text: `Commented on your post saying "I don’t know where this thugs come from".`,
    timestampLabel: "10h",
    group: "Today",
    unread: true,
  },
  {
    id: "n-susan-1",
    actorName: "Susan Folake",
    actorAvatar:
      "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/6_kh4s4a.jpg",
    text: `Commented on your post saying "I don’t know where this thugs come from".`,
    timestampLabel: "20h",
    group: "Yesterday",
    unread: true,
  },
  {
    id: "n-faith-1",
    actorName: "Faith Mutumina",
    actorAvatar:
      "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/7_gh7u7q.jpg",
    text: `Commented on your post saying "I don’t know where this thugs come from".`,
    timestampLabel: "1d",
    group: "Yesterday",
  },
  {
    id: "n-david-1",
    actorName: "David Chizorba",
    actorAvatar:
      "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/5_iwqfjh.jpg",
    text: `Commented on your post saying "I don’t know where this thugs come from".`,
    timestampLabel: "1d",
    group: "Yesterday",
  },
];

