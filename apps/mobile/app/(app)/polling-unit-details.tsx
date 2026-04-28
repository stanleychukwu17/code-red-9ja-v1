import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReportPollingUnitSheet } from "@/components/app/report-polling-unit-sheet";
import { ScreenHeader } from "@/components/app/screen-headers";
import { PostCard, type FeedPost } from "@/components/app/social-primitives";
import { CandidateTile } from "@/components/app/tiles/candidate-tile";
import { UploadVoteResultSheet } from "@/components/app/upload-vote-result-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { WhatsHappening } from "./(tabs)/feed";

type TopTab = "Feed" | "Votes" | "Activities";
type VoteTab = "Main" | "From voters" | "From INEC";
type FeedFilterTab = "All" | "Reports" | "Situation Report";

const AUTH_USER_IMAGE =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";
const ATIKU_IMAGE = "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg";
const PETER_IMAGE =
  "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg";
const TINUBU_IMAGE =
  "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg";

const VOTE_ROWS = [
  {
    name: "Atiku Abubakar",
    votes: "203 votes",
    rank: "#1",
    image: ATIKU_IMAGE,
  },
  { name: "Peter Obi", votes: "166 votes", rank: "#2", image: PETER_IMAGE },
  { name: "Bola Tinibu", votes: "173 votes", rank: "#3", image: TINUBU_IMAGE },
  {
    name: "Rabiu Kwankwaso",
    votes: "82 votes",
    rank: "#4",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    name: "Christopher Imu...",
    votes: "23 votes",
    rank: "#5",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    name: "Hamza al-Mustap...",
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
];

const VOTER_UPLOADS = [
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

const INEC_UPLOAD = {
  id: "inec-upload-1",
  author: "INEC",
  timestamp: "8:23 AM . Jan 21",
  avatar:
    "hhttps://www.womenconsortiumofnigeria.org/sites/default/files/styles/pageimage/public/field/image/inec.jpg?itok=MJJlmFxo",
  image:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&h=1600&fit=crop",
};

const ACTIVITY_ROWS = [
  {
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    text: "Gozie Nwosu uploaded vote result · 8:49 PM, Jan 19",
    accent: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    text: "Esther uploaded vote result · 7:15 PM, Jan 19",
    accent: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    text: "James Ugona posted a situation report · 3:07 PM, Jan 19",
    accent: true,
  },
  {
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop",
    text: "Jennifer Omale uploaded vote result · 3:01 PM, Jan 19",
    accent: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    text: "James Ugona posted a situation report · 2:11 PM, Jan 19",
    accent: true,
  },
];

const POLLING_UNIT_POSTS: FeedPost[] = [
  {
    id: "polling-unit-feed-1",
    author: "Nathan Bwala",
    meta: "KOFAR FADA...",
    timestamp: "7:10 AM, Jan 23",
    content:
      "Got to my polling unit by 7:10am and the queue is already long. People are determined this time. Let’s do this 🇳🇬",
    likes: "1.2k",
    comments: "178",
    avatarColor: "#30374A",
    avatarImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=900&fit=crop",
  },
  {
    id: "polling-unit-feed-2",
    author: "Aisha Yusuf",
    meta: "Jefabo",
    timestamp: "9:31 PM, Jan 23",
    content:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    likes: "71",
    comments: "12",
    avatarColor: "#C56B74",
    avatarImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  },
];

const POLLING_UNIT_REPORTS: FeedPost[] = [
  {
    id: "polling-unit-report-1",
    author: "Dan Joffery",
    timestamp: "3h",
    topRightText: "3h",
    content:
      "We currently have Multiple voting and Impersonation of voters taking place here. Free9ja please do something.",
    likes: "1.2k",
    comments: "178",
    avatarColor: "#87A5C4",
    avatarImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    authorTextColor: "#FF3A3A",
    tags: ["Multiple voting", "Impersonation of voters"],
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=900&fit=crop",
  },
  {
    id: "polling-unit-report-2",
    author: "Salima Alima",
    timestamp: "3h",
    topRightText: "3h",
    content:
      "This polling unit agents are acting very suspicious. One is at the back behaving very funny.",
    likes: "71",
    comments: "12",
    avatarColor: "#DA9A4A",
    avatarImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    authorTextColor: "#FF3A3A",
    tags: ["Suspicious movement"],
  },
  {
    id: "polling-unit-report-3",
    author: "Emeka Eze",
    timestamp: "1h",
    topRightText: "1h",
    content:
      "There is clear vote buying happening close to the entrance and voters are being approached in turns.",
    likes: "44",
    comments: "9",
    avatarColor: "#C9A96E",
    authorTextColor: "#FF3A3A",
    tags: ["Vote buying"],
  },
];

const POLLING_UNIT_SITUATION_REPORTS: FeedPost[] = [
  {
    id: "polling-unit-situation-1",
    author: "James Ugona",
    timestamp: "8:23 AM · Jan 19",
    topRightText: "8:23 AM . Jan 19",
    content:
      "Polling unit officers are yet to arrive over here. I hope this is not one of their tactics",
    likes: "71",
    comments: "12",
    avatarColor: "#63758E",
    avatarImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    authorTextColor: "#4B58FF",
    tags: ["Refusal to follow procedures"],
  },
  {
    id: "polling-unit-situation-2",
    author: "James Ugona",
    timestamp: "8:45 AM · Jan 19",
    topRightText: "8:45 AM . Jan 19",
    content: "They just arrived now, that’s 43 minutes late",
    likes: "71",
    comments: "12",
    avatarColor: "#63758E",
    avatarImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    authorTextColor: "#4B58FF",
    tags: ["Refusal to follow procedures"],
  },
  {
    id: "polling-unit-situation-3",
    author: "James Ugona",
    timestamp: "8:57 AM · Jan 19",
    topRightText: "8:57 AM . Jan 19",
    content: "Election just started, and voting has started.",
    likes: "71",
    comments: "12",
    avatarColor: "#63758E",
    avatarImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    authorTextColor: "#4B58FF",
  },
  {
    id: "polling-unit-situation-4",
    author: "James Ugona",
    timestamp: "9:14 AM · Jan 19",
    topRightText: "9:14 AM . Jan 19",
    content:
      "The queue is building up and things are moving slowly but calmly.",
    likes: "53",
    comments: "8",
    avatarColor: "#63758E",
    avatarImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    authorTextColor: "#4B58FF",
  },
];

export default function PollingUnitDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ state?: string; unit?: string }>();
  const [topTab, setTopTab] = useState<TopTab>("Feed");
  const [voteTab, setVoteTab] = useState<VoteTab>("Main");
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const stateName = params.state ?? "Lagos";
  const unitName = params.unit ?? "KOFAR FADA DOKA";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={`${stateName} State`}
          onBackPress={() => router.back()}
          showBackButton
        />
        <View className="pb-4 pt-4">
          <View className="px-4">
            <View className="mb-6 flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[18px] text-[#7F7B7E]">Polling unit</Text>
                <Text className="mt-2 text-[32px] font-bold leading-[40px] text-brand">
                  {unitName}
                </Text>

                <View className="mt-6 flex-row items-center">
                  <MetricBlock value="302" label="Votes" />
                  <MetricDivider />
                  <MetricBlock value="2" label="Agents" />
                  <MetricDivider />
                  <MetricBlock value="3" label="Reports" />
                </View>
              </View>

              <View className="relative mt-3">
                <Image
                  source={TINUBU_IMAGE}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  style={{ width: 104, height: 104, borderRadius: 999 }}
                />
                <View className="absolute bottom-1 right-0 h-9 w-9 items-center justify-center rounded-full bg-[#D5E2DA]">
                  <Text className="text-[16px] font-bold text-black">#1</Text>
                </View>
              </View>
            </View>

            <View className="mb-5 h-12 flex-row items-center justify-between rounded-[8px] bg-[#FFE39B] px-5">
              <View className="flex-row items-center">
                <MaterialIcons
                  name="flag"
                  size={18}
                  color="#B26B12"
                  style={{ marginRight: 12 }}
                />
                <Text className="text-[16px] font-medium text-[#1B1A1B]">
                  Flagged polling units
                </Text>
              </View>
              <Text className="text-[16px] font-bold text-[#9A5B0F]">302</Text>
            </View>

            <Button
              label="Upload Vote Result"
              variant="purple"
              size="lg"
              className="mb-5 h-[60px] rounded-[16px]"
              onPress={() => setUploadSheetVisible(true)}
            />

            <Button
              label="Report this polling unit"
              variant="outlineDanger"
              size="lg"
              className="mb-4 h-[60px] rounded-[16px]"
              onPress={() => setReportSheetVisible(true)}
              leftAdornment={
                <MaterialIcons name="campaign" size={18} color="#F52828" />
              }
            />
          </View>
          <PollingUnitTabs value={topTab} onChange={setTopTab} />
        </View>

        <View>
          {topTab === "Feed" ? (
            <FeedPanel
              onPostPress={(id) =>
                router.push({
                  pathname: "/post-detail",
                  params: { id },
                })
              }
            />
          ) : topTab === "Votes" ? (
            <VotesPanel
              value={voteTab}
              onChange={setVoteTab}
              onCandidatePress={(name) =>
                router.push({
                  pathname: "/(app)/profile",
                  params: { name },
                })
              }
            />
          ) : (
            <ActivitiesPanel />
          )}
        </View>
      </ScrollView>

      <ReportPollingUnitSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
      />
      <UploadVoteResultSheet
        visible={uploadSheetVisible}
        onClose={() => setUploadSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

export function MetricBlock({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View>
      <Text className="text-[24px] font-medium text-[#1C1A1B]">{value}</Text>
      <Text className="mt-1 text-[14px] text-[#7F7B7E]">{label}</Text>
    </View>
  );
}

function MetricDivider() {
  return <View className="mx-6 h-8 w-px bg-[#D8D2D5]" />;
}

function PollingUnitTabs({
  value,
  onChange,
}: {
  value: TopTab;
  onChange: (value: TopTab) => void;
}) {
  const tabs: TopTab[] = ["Feed", "Votes", "Activities"];

  return (
    <View className="flex-row items-center justify-center border-b border-black/5 px-4">
      {tabs.map((tab) => {
        const selected = value === tab;

        return (
          <Pressable
            key={tab}
            className={cn(
              "flex-1 items-center border-b-[3px] border-transparent pb-4 pt-7",
              selected ? "border-b-[3px] border-black" : "",
            )}
            onPress={() => onChange(tab)}
          >
            <Text
              className={cn(
                "text-[17px] font-bold",
                selected ? "text-[#171416]" : "text-[#B5B0B3]",
              )}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FeedPanel({ onPostPress }: { onPostPress: (id: string) => void }) {
  const [feedFilter, setFeedFilter] = useState<FeedFilterTab>("All");
  const posts =
    feedFilter === "All"
      ? [
          ...POLLING_UNIT_POSTS,
          ...POLLING_UNIT_REPORTS,
          ...POLLING_UNIT_SITUATION_REPORTS,
        ]
      : feedFilter === "Reports"
        ? POLLING_UNIT_REPORTS
        : POLLING_UNIT_SITUATION_REPORTS;

  return (
    <View>
      <FeedFilterTabs value={feedFilter} onChange={setFeedFilter} />

      {feedFilter === "All" ? (
        <WhatsHappening className="px-3 pb-5 py-2" />
      ) : feedFilter === "Situation Report" ? (
        <SituationReportComposer />
      ) : null}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPress={() => onPostPress(post.id)}
        />
      ))}
    </View>
  );
}

function FeedFilterTabs({
  value,
  onChange,
}: {
  value: FeedFilterTab;
  onChange: (value: FeedFilterTab) => void;
}) {
  const tabs: { key: FeedFilterTab; label: string }[] = [
    { key: "All", label: "All" },
    { key: "Reports", label: "Reports 3" },
    { key: "Situation Report", label: "Situation Report 4" },
  ];

  return (
    <View className="mb-3 flex-row items-center px-5">
      {tabs.map((tab) => {
        const selected = value === tab.key;
        const selectedClassName =
          tab.key === "Reports"
            ? "bg-[#FFE4E4]"
            : tab.key === "Situation Report"
              ? "bg-[#E5E4FF]"
              : "bg-[#E5E1E6]";
        const selectedTextClassName =
          tab.key === "Reports"
            ? "text-[#FF3A3A]"
            : tab.key === "Situation Report"
              ? "text-[#4756FF]"
              : "text-[#171416]";

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={cn(
              "rounded-full px-6 py-4",
              selected ? selectedClassName : "bg-transparent",
            )}
          >
            <Text
              className={cn(
                "text-[16px] font-bold",
                selected ? selectedTextClassName : "text-[#171416]",
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SituationReportComposer() {
  return (
    <View className="border-b border-black/5 px-5 py-4">
      <View className="flex-row items-center gap-3">
        <Image
          source={AUTH_USER_IMAGE}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: 44, height: 44, borderRadius: 999 }}
        />
        <Text className="flex-1 text-[18px] text-[#6C66FF]">
          Give situation report
        </Text>
        <MaterialIcons name="image" size={28} color="#8E898B" />
      </View>
    </View>
  );
}

function VotesPanel({
  value,
  onChange,
  onCandidatePress,
}: {
  value: VoteTab;
  onChange: (value: VoteTab) => void;
  onCandidatePress: (name: string) => void;
}) {
  const tabs: VoteTab[] = ["Main", "From voters", "From INEC"];

  return (
    <View>
      <View className="mb-6 px-4 flex-row items-center gap-3">
        {tabs.map((tab, index) => {
          const active = value === tab;
          const suffix = index === 1 ? "2" : index === 2 ? "1" : "";

          return (
            <Pressable
              key={tab}
              onPress={() => onChange(tab)}
              className={cn(
                "rounded-full px-4 py-4",
                active ? "bg-[#E5E1E6]" : "bg-transparent",
              )}
            >
              <Text className="text-[16px] font-bold text-[#1C1A1B]">
                {tab}
                <Text className="text-[#8E878C]">
                  {suffix ? ` ${suffix}` : ""}
                </Text>
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value === "Main" ? (
        VOTE_ROWS.map((row) => (
          <CandidateTile
            key={row.name}
            name={row.name}
            votes={row.votes}
            rank={row.rank}
            image={row.image}
            onPress={() => onCandidatePress(row.name)}
          />
        ))
      ) : value === "From voters" ? (
        <View className="gap-7 px-4">
          {VOTER_UPLOADS.map((upload) => (
            <VoteUploadCard key={upload.id} upload={upload} />
          ))}
        </View>
      ) : (
        <View className="px-4">
          <View className="mb-5 flex-row items-center rounded-[8px] bg-[#FFE39B] px-4 py-4">
            <MaterialIcons
              name="flag"
              size={17}
              color="#9A5B0F"
              style={{ marginRight: 12 }}
            />
            <Text className="flex-1 text-[16px] leading-7 text-[#1F1A16]">
              INEC upload does not match <Text className="font-bold">78%</Text>{" "}
              of voters upload.
            </Text>
          </View>

          <VoteUploadCard upload={INEC_UPLOAD} />
        </View>
      )}
    </View>
  );
}

function VoteUploadCard({
  upload,
}: {
  upload: {
    author: string;
    timestamp: string;
    avatar: string;
    image: string;
  };
}) {
  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            source={upload.avatar}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              marginRight: 12,
            }}
          />
          <Text className="text-[16px] font-bold text-[#171416]">
            {upload.author}
          </Text>
        </View>
        <Text className="text-[14px] text-[#8B8589]">{upload.timestamp}</Text>
      </View>

      <Image
        source={upload.image}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: "100%", height: 520, borderRadius: 0 }}
      />
    </View>
  );
}

function ActivitiesPanel() {
  return (
    <View>
      {ACTIVITY_ROWS.map((row, index) => (
        <View
          key={`${row.text}-${index}`}
          className="min-h-20 flex-row items-center gap-3 px-4"
        >
          <Image
            source={row.image}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
            }}
          />
          <Text className="flex-1 text-[16px] leading-6 text-[#2A2729]">
            {row.accent ? (
              <Text className="font-medium text-[#5D6BFF]">
                {row.text.split(" ")[0]} {row.text.split(" ")[1]}
              </Text>
            ) : (
              <Text className="font-medium text-black/80">
                {row.text.split(" ")[0]} {row.text.split(" ")[1]}
              </Text>
            )}{" "}
            {row.text.split(" ").slice(2).join(" ")}
          </Text>
        </View>
      ))}
    </View>
  );
}
