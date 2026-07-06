import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { FeedPost, PostCard } from "@/components/app/social-primitives";
import { cn } from "@/components/ui/cn";
import { ProfileHeader } from "@/components/app/screen-headers";

const PROFILE_IMAGE =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";

const PARTY_LOGO =
  "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png";

type ProfileTab = "Feed" | "Votes" | "Campaign" | "About";

const CANDIDATES = {
  "Atiku Abubakar": {
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
    party: "PDP",
    votes: "2,112,382",
    statesWinning: "14",
    bio: "Former vice president of Nigeria",
    feedMeta: "INEC HQ Voti...",
    feedText:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    about:
      "Follower of Jesus | Also someone whose very much interested in having their vote actually count in our beautiful country called Nigeria. Sadly, the day has never come, I see it coming with the help of this app though. #free9ja",
  },
  "Peter Obi": {
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
    party: "LP",
    votes: "1,982,420",
    statesWinning: "11",
    bio: "Former governor of Anambra State",
    feedMeta: "Labour HQ...",
    feedText:
      "The crowd turnout across polling units today shows how energized our supporters are for real change.",
    about:
      "Public servant, businessman, and advocate for accountable leadership across Nigeria. Focused on rebuilding trust in institutions and delivering measurable outcomes.",
  },
  "Bola Tinubu": {
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
    party: "APC",
    votes: "1,774,310",
    statesWinning: "9",
    bio: "Former governor of Lagos State",
    feedMeta: "APC Campaign",
    feedText:
      "We are seeing strong numbers from urban centers and grassroots coordination remains our biggest strength.",
    about:
      "Politician and strategist with a long record in party organizing, coalition building, and governance reform initiatives.",
  },
} as const;

const CANDIDATE_VOTES_ROWS = [
  { state: "Abuja", votes: "2.8m votes", rank: "#1" },
  { state: "Kaduna", votes: "2.8m votes", rank: "#2" },
  { state: "Edo", votes: "2.8m votes", rank: "#1" },
  { state: "Enugu", votes: "2.8m votes", rank: "#1" },
  { state: "Anambara", votes: "2.8m votes", rank: "#3" },
  { state: "Imo", votes: "2.8m votes", rank: "#1" },
  { state: "Cross River", votes: "2.8m votes", rank: "#1" },
  { state: "Borno", votes: "2.8m votes", rank: "#2" },
] as const;

const CAMPAIGN_ITEMS = [
  { title: "Restructuring Nigeria / True Federalism", color: "#DDEDE8" },
  { title: "Economic Growth", color: "#F8E9C4" },
  { title: "Job Creation and Poverty Reduction", color: "#E2D0F7" },
  { title: "Infrastructure & Power", color: "#F5C7CB" },
] as const;

const PROFILE_POSTS: FeedPost[] = [
  {
    id: "vote-buying",
    author: "Daniel Chibueze",
    meta: "Jefabo" as any,
    timestamp: "9:31 PM, Jan 23",
    content:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    likes: "71",
    comments: "12",
    avatarColor: "#30374A",
    avatarImage: PROFILE_IMAGE,
  },
  {
    id: "pu-014",
    author: "Lotta Chukwuka",
    meta: "PU 014",
    timestamp: "7:10 AM, Jan 23",
    content:
      "INEC officials still not here at PU 014, we’ve been waiting since 8am.",
    likes: "35",
    comments: "7",
    avatarColor: "#30374A",
    avatarImage: PROFILE_IMAGE,
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=900&fit=crop",
  },
] as const;

export default function ProfileScreen() {
  return <ProfileScreenContent showBottomNav />;
}

export function ProfileScreenContent({
  showBottomNav,
}: {
  showBottomNav?: boolean;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const [tab, setTab] = useState<ProfileTab>("Feed");
  const [openCampaignItem, setOpenCampaignItem] = useState<string | null>(null);

  const candidateName = useMemo(() => {
    if (!params.name) return null;

    const exactMatch = Object.keys(CANDIDATES).find(
      (name) => name === params.name,
    );
    if (exactMatch) return exactMatch;

    const normalizedParam = params.name.replace("...", "").trim().toLowerCase();
    const partialMatch = Object.keys(CANDIDATES).find((name) =>
      name.toLowerCase().includes(normalizedParam),
    );

    return partialMatch ?? null;
  }, [params.name]);

  const candidate = candidateName
    ? CANDIDATES[candidateName as keyof typeof CANDIDATES]
    : null;
  const isMyProfile = !params.name;
  const isCandidateProfile = Boolean(candidate);
  const tabs: ProfileTab[] = isCandidateProfile
    ? ["Feed", "Votes", "Campaign", "About"]
    : ["Feed", "About"];

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab("Feed");
    }
  }, [tab, tabs]);

  const candidatePosts = useMemo(
    () =>
      candidate && candidateName
        ? [
            {
              id: "nathan-bwala",
              author: candidateName,
              meta: candidate.feedMeta,
              content: candidate.feedText,
              likes: "71",
              comments: "12",
              avatarColor: "#30374A",
              avatarImage: candidate.image,
            },
          ]
        : [],
    [candidate, candidateName],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader
            title={isMyProfile ? "My Profile" : "Profile"}
            showBackButton={!isMyProfile}
            onBackPress={() => router.back()}
          />
          <View className="pb-4 pt-4">
            <ProfileTop
              isCandidate={isCandidateProfile}
              candidateName={candidateName}
              candidateImage={candidate?.image}
              candidateParty={candidate?.party}
              candidateVotes={candidate?.votes}
              candidateStatesWinning={candidate?.statesWinning}
              bio={candidate?.bio}
            />

            <View className="px-4 flex-row justify-center items-center border-b border-black/5 ">
              {tabs.map((item) => {
                const selected = tab === item;

                return (
                  <Pressable
                    key={item}
                    className={cn(
                      "flex-1 items-center pb-4 pt-7 border-b-[3px] border-transparent",
                      selected ? "border-b-[3px] border-[#171416]" : "",
                    )}
                    onPress={() => setTab(item)}
                  >
                    <Text
                      className={cn(
                        "text-[17px] font-bold",
                        selected ? "text-[#171416]" : "text-[#B5B0B3]",
                      )}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {tab === "Feed" ? (
            <View>
              {(isCandidateProfile ? candidatePosts : PROFILE_POSTS).map(
                (post) => (
                  <PostCard
                    key={post.id}
                    post={post as any}
                    onPress={() =>
                      router.push({
                        pathname: "/post-detail",
                        params: { id: post.id },
                      })
                    }
                  />
                ),
              )}
            </View>
          ) : tab === "Votes" ? (
            <VotesPanel />
          ) : tab === "Campaign" ? (
            <CampaignPanel
              openItem={openCampaignItem}
              onToggle={(title) =>
                setOpenCampaignItem((current) =>
                  current === title ? null : title,
                )
              }
            />
          ) : (
            <AboutSection
              aboutText={
                candidate?.about ??
                "Follower of Jesus | Also someone whose very much interested in having their vote actually count in our beautiful country called Nigeria. Sadly, the day has never come, I see it coming with the help of this app though. #free9ja"
              }
            />
          )}
        </ScrollView>

        {showBottomNav && isMyProfile ? <AppBottomNav /> : null}
      </View>
    </SafeAreaView>
  );
}

function ProfileTop({
  isCandidate,
  candidateName,
  candidateImage,
  candidateParty,
  candidateVotes,
  candidateStatesWinning,
  bio,
}: {
  isCandidate: boolean;
  candidateName?: string | null;
  candidateImage?: string;
  candidateParty?: string;
  candidateVotes?: string;
  candidateStatesWinning?: string;
  bio?: string;
}) {
  return (
    <View className="px-4 gap-4">
      <View className="flex-row gap-4">
        <View className="relative  h-[100px] ">
          <Image
            source={isCandidate ? candidateImage : PROFILE_IMAGE}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={{ width: 100, height: 100, borderRadius: 999 }}
          />
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-[#C8CDC3]">
            <Text className="text-[16px] font-bold text-black">V</Text>
          </View>
        </View>

        <View className="flex-1 pt-1">
          <Text className="text-[18px] font-bold text-black/80">
            {isCandidate ? candidateName : "Lotta Chukwuka"}
          </Text>

          <View className="mt-3 flex-row items-center gap-4">
            <View className="rounded-[6px] bg-[#F2E7FF] px-2.5 py-1.5">
              <Text className="text-[15px] font-semibold text-[#8B52FF]">
                {isCandidate ? "Candidate" : "Polling Unit Agent"}
              </Text>
            </View>

            <View className="flex-row gap-2 items-center">
              <Image
                source={PARTY_LOGO}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={{ width: 20, height: 20, borderRadius: 999 }}
              />
              <Text className="text-[16px] text-[#3C393B]">
                {isCandidate ? candidateParty : "PDP"}
              </Text>
            </View>
          </View>

          {isCandidate ? (
            <View className="mt-4 flex-row items-start">
              <Metric value={candidateVotes ?? "-"} label="Votes" />
              <View className="ml-8">
                <Metric
                  value={candidateStatesWinning ?? "-"}
                  label="States winning"
                />
              </View>
            </View>
          ) : (
            <View className="mt-4 gap-y-3 flex-row flex-wrap gap-2">
              <MetaRow icon="square" text="PU: PW Junction" />
              <MetaRow icon="place" text="FCT, Abuja" />
              <MetaRow icon="calendar-month" text="Joined May 1, 2026" />
            </View>
          )}
        </View>
      </View>

      <Text className="text-[16px] leading-8 text-[#2A2628]">
        {isCandidate ? bio : "I’m new here and ready to vote ✌."}
      </Text>
    </View>
  );
}

function MetaRow({
  icon,
  text,
}: {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <MaterialIcons name={icon} size={17} color="#8A8588" />
      <Text className="text-[14px] text-[#706A6E]">{text}</Text>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text className="text-[18px] text-[#1E1A1C]">{value}</Text>
      <Text className="mt-1 text-[14px] text-[#6F6A6E]">{label}</Text>
    </View>
  );
}

function VotesPanel() {
  return (
    <View className="px-5 pt-2">
      {CANDIDATE_VOTES_ROWS.map((row) => (
        <View key={row.state} className="flex-row items-center py-5">
          <Text className="flex-1 text-[17px] text-[#242123]">{row.state}</Text>
          <Text className="mr-8 text-[17px] font-bold text-[#242123]">
            {row.votes}
          </Text>
          <Text className="text-[17px] font-bold text-black/40">
            {row.rank}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CampaignPanel({
  openItem,
  onToggle,
}: {
  openItem: string | null;
  onToggle: (title: string) => void;
}) {
  return (
    <View className="px-5 pt-2">
      <Text className="text-[16px] text-[#8E888D]">Slogan</Text>
      <Text className="mt-2 text-[18px] leading-9 text-[#2A2628]">
        Atikulated.
      </Text>

      <View className="mt-8 gap-y-5">
        {CAMPAIGN_ITEMS.map((item) => (
          <Pressable
            key={item.title}
            className="rounded-[18px] px-5 py-6"
            style={{ backgroundColor: item.color }}
            onPress={() => onToggle(item.title)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-4 text-[17px] font-bold text-[#242123]">
                {item.title}
              </Text>
              <MaterialIcons
                name={openItem === item.title ? "expand-less" : "expand-more"}
                size={20}
                color="#6A6569"
              />
            </View>

            {openItem === item.title ? (
              <Text className="mt-4 text-[16px] leading-8 text-[#4D474B]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AboutSection({ aboutText }: { aboutText: string }) {
  return (
    <View className="px-5">
      <Text className="text-[18px] leading-8 text-[#282426]">{aboutText}</Text>

      <View className="mt-12">
        <Text className="text-[16px] text-[#969196]">Date of birth</Text>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-[18px] text-[#3A3638]">November 25, 1946</Text>
          <Text className="text-[18px] font-bold text-[#3A3638]">79 years</Text>
        </View>
      </View>

      <View className="mt-12">
        <Text className="text-[16px] text-[#969196]">Place of Origin</Text>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-[18px] text-[#3A3638]">Adamawa, Nigeria</Text>
          <View className="h-5 w-7 overflow-hidden rounded-[4px]">
            <View className="flex-1 flex-row">
              <View className="flex-1 bg-[#0B9D53]" />
              <View className="flex-1 bg-white" />
              <View className="flex-1 bg-[#0B9D53]" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
