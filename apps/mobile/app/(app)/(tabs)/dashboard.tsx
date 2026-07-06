import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { ChangePollingUnitSheet } from "@/components/app/change-polling-unit-sheet";
import { ProfileDrawer } from "@/components/app/profile-drawer";
import { ReportPollingUnitSheet } from "@/components/app/report-polling-unit-sheet";
import { UploadVoteResultSheet } from "@/components/app/upload-vote-result-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { FlowPickerSheet } from "@/components/onboarding/flow-screen";
import { DashboardHeader } from "@/components/app/screen-headers";

const LEADERS = [
  {
    name: "Atiku Abubakar",
    votes: "4.9m votes",
    rank: "#1",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Peter Obi",
    votes: "4.7m votes",
    rank: "#2",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Bola Tinubu",
    votes: "3.8m votes",
    rank: "#3",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
];

const STATE_LEADERS = [
  {
    state: "Lagos",
    votes: "2.2m votes",
    rank: "#3",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
    highlighted: true,
  },
  {
    state: "Abuja",
    votes: "2.8m votes",
    rank: "#1",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    state: "Kaduna",
    votes: "2.5m votes",
    rank: "#2",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
];

const ELECTION_OPTIONS = [
  "Presidential Election",
  "House of Rep Election",
  "Senatorial Election",
];

export default function DashboardScreen() {
  const router = useRouter();
  const [changeSheetVisible, setChangeSheetVisible] = useState(false);
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const [electionSheetVisible, setElectionSheetVisible] = useState(false);
  const [selectedElection, setSelectedElection] = useState(
    "Presidential Election",
  );
  const [pollingUnit, setPollingUnit] = useState("PW Junction");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 124 }}
          showsVerticalScrollIndicator={false}
        >
          <DashboardHeader
            className="pl-4"
            onAvatarPress={() => setProfileDrawerVisible(true)}
            onUsersPress={() => router.push("/app-users")}
            onNotificationsPress={() => router.push("/notifications")}
          />
          <View className="pb-8 gap-6">
            <LeaderboardCard
              className="mx-4"
              onShowAllPress={() => router.push("/candidates")}
              onLeaderPress={(name) =>
                router.push({
                  pathname: "/user-profile",
                  params: { name },
                })
              }
            />
            {/* <ElectionSection /> */}
            <PollingUnitSection
              pollingUnit={pollingUnit}
              onChangePress={() => setChangeSheetVisible(true)}
              onOpenDetails={() =>
                router.push({
                  pathname: "/polling-unit-details",
                  params: { state: "Abuja", unit: pollingUnit },
                })
              }
              onReportPress={() => setReportSheetVisible(true)}
              onUploadPress={() => setUploadSheetVisible(true)}
            />
            <VotingNoticeCard />
            <StatesSection onShowAllPress={() => router.push("/states")} />
          </View>
        </ScrollView>

        <AppBottomNav />
        <ChangePollingUnitSheet
          visible={changeSheetVisible}
          onClose={() => setChangeSheetVisible(false)}
          onSubmit={({ pollingUnit: nextPollingUnit }) => {
            setPollingUnit(nextPollingUnit);
            setChangeSheetVisible(false);
          }}
        />
        <UploadVoteResultSheet
          visible={uploadSheetVisible}
          onClose={() => setUploadSheetVisible(false)}
        />
        <ReportPollingUnitSheet
          visible={reportSheetVisible}
          onClose={() => setReportSheetVisible(false)}
        />
        <ProfileDrawer
          visible={profileDrawerVisible}
          onClose={() => setProfileDrawerVisible(false)}
          onProfilePress={() => router.push("/profile")}
          currentElection={selectedElection}
          onElectionPress={() => {
            setProfileDrawerVisible(false);
            setTimeout(() => {
              setElectionSheetVisible(true);
            }, 260);
          }}
          onDidVotePress={() => {
            setProfileDrawerVisible(false);
            setTimeout(() => {
              router.push("/did-vote");
            }, 260);
          }}
          onVotingIntentPress={() => {
            setProfileDrawerVisible(false);
            setTimeout(() => {
              router.push("/voting-intent");
            }, 260);
          }}
        />
        <FlowPickerSheet
          visible={electionSheetVisible}
          onClose={() => setElectionSheetVisible(false)}
          selectedValue={selectedElection}
          title="Election"
          options={ELECTION_OPTIONS}
          onSelect={setSelectedElection}
        />
      </View>
    </SafeAreaView>
  );
}

function LeaderboardCard({
  onShowAllPress,
  onLeaderPress,
  className,
}: {
  className?: string;
  onShowAllPress: () => void;
  onLeaderPress: (name: string) => void;
}) {
  return (
    <View
      className={cn(
        "rounded-[26px] bg-[#121212] px-4 pb-4 pt-3 gap-4",
        className,
      )}
    >
      <View>
        {LEADERS.map((leader, index) => (
          <Pressable
            key={leader.name}
            className={cn("flex-row items-center h-16")}
            onPress={() => onLeaderPress(leader.name)}
          >
            <Image
              source={leader.image}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                marginRight: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            />
            <Text className="flex-1 text-[16px] text-white">{leader.name}</Text>
            <Text className="mr-5 text-[16px] font-bold text-white">
              {leader.votes}
            </Text>
            <Text className="text-[16px] font-bold text-white/45">
              {leader.rank}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        label="Show all"
        variant="neutral"
        size="lg"
        className="h-16 rounded-[12px]"
        onPress={onShowAllPress}
      />
    </View>
  );
}

function PollingUnitSection({
  pollingUnit,
  onChangePress,
  onOpenDetails,
  onReportPress,
  onUploadPress,
}: {
  pollingUnit: string;
  onChangePress: () => void;
  onOpenDetails: () => void;
  onReportPress: () => void;
  onUploadPress: () => void;
}) {
  return (
    <View className="px-4 gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[18px] font-medium text-[#343133]">
          My Polling Unit
        </Text>
        <Pressable
          className="flex-row items-center"
          hitSlop={8}
          onPress={onChangePress}
        >
          <MaterialIcons
            name="link"
            size={16}
            color="#8B8589"
            style={{ marginRight: 6 }}
          />
          <Text className="text-[16px] font-medium text-[#8B8589]">Change</Text>
        </Pressable>
      </View>

      <Pressable
        className="h-20 flex-row items-center rounded-[18px] bg-[#DDD0FF] px-5 py-5"
        onPress={onOpenDetails}
      >
        <View className="mr-4 h-11 w-11 items-center justify-center rounded-[12px] bg-[#D0C0FF]">
          <MaterialIcons name="ballot" size={24} color="#F2A83B" />
        </View>
        <Text className="flex-1 text-[16px] font-medium text-[#222021]">
          {pollingUnit}
        </Text>
        <Text className="text-[16px] font-bold text-[#222021]">302 votes</Text>
      </Pressable>

      <Button
        label="Upload Vote Result"
        variant="purple"
        size="lg"
        className="h-[60px] rounded-[18px]"
        onPress={onUploadPress}
      />

      <Button
        label="Report this Polling Unit"
        variant="outlineDanger"
        size="lg"
        className="h-[60px] rounded-[18px]"
        onPress={onReportPress}
        leftAdornment={
          <MaterialIcons name="campaign" size={18} color="#F52828" />
        }
      />
    </View>
  );
}

function VotingNoticeCard() {
  return (
    <View className="mx-4 rounded-[22px] bg-[#FFE7A9] px-4 py-5">
      <View className="mb-4 flex-row items-start">
        <MaterialIcons
          name="notifications"
          size={18}
          color="#A86715"
          style={{ marginRight: 10, marginTop: 3 }}
        />
        <Text className="flex-1 text-[16px] leading-6 text-[#201E1F]">
          Please wait to the end of election at your polling unit.
        </Text>
      </View>

      <View className="pl-7">
        <Text className="text-[16px] leading-6 text-[#201E1F]">
          Once everyone has voted, request to snap a picture of the results and
          click upload vote result to upload your polling unit’s result.
        </Text>
        <Text className="mt-6 text-[16px] leading-6 text-[#201E1F]">
          By doing this, you ensure that your vote indeed count.
        </Text>
      </View>
    </View>
  );
}

function StatesSection({ onShowAllPress }: { onShowAllPress: () => void }) {
  const router = useRouter();

  return (
    <View className="mx-4 gap-4">
      <Text className="text-[18px] font-medium text-[#343133]">States</Text>

      <View className="rounded-[22px] bg-white p-2">
        {STATE_LEADERS.map((item) => (
          <Pressable
            key={item.state}
            className={cn(
              "flex-row items-center rounded-[16px] px-3 py-4",
              item.highlighted && "bg-[#E6F4EE]",
            )}
            onPress={() =>
              router.push({
                pathname: "/state-details",
                params: { state: item.state },
              })
            }
          >
            <Text className="flex-1 text-[16px] font-medium text-[#222021]">
              {item.state}
            </Text>
            <Image
              source={item.image}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                marginRight: 14,
              }}
            />
            <Text className="mr-5 text-[16px] font-bold text-[#222021]">
              {item.votes}
            </Text>
            <Text className="text-[16px] font-bold text-black/40">
              {item.rank}
            </Text>
          </Pressable>
        ))}

        <View className="px-1 pb-1 pt-3">
          <Button
            label="Show all"
            variant="neutral"
            size="lg"
            className="h-[58px] rounded-[16px] bg-[#EFEFEF]"
            textClassName="text-black"
            onPress={onShowAllPress}
          />
        </View>
      </View>
    </View>
  );
}
