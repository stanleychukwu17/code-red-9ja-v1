import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ComponentType } from "react";
import {
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

const StyledSafeAreaView = SafeAreaView as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledScrollView = ScrollView as unknown as ComponentType<
  ScrollViewProps & { className?: string }
>;
const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;

const LEADERS = [
  { name: "Atiku Abubakar", votes: "4.9m votes", rank: "#1", color: "#C7D2E8" },
  { name: "Peter Obi", votes: "4.7m votes", rank: "#2", color: "#D9E3EA" },
  { name: "Bola Tinubu", votes: "3.8m votes", rank: "#3", color: "#D9B5C0" },
];

const ELECTIONS = ["Presidential", "House of Rep", "Senato"];

const NAV_ITEMS = [
  { label: "Home", icon: "home-filled", active: true },
  { label: "Feed", icon: "feed", active: false },
  { label: "Post", icon: "add-circle", active: false },
  { label: "Search", icon: "search", active: false },
  { label: "Profile", icon: "person-outline", active: false },
] as const;

export default function DashboardScreen() {
  return (
    <StyledSafeAreaView className="flex-1 bg-surface">
      <StyledView className="flex-1">
        <StyledScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 124 }}
          showsVerticalScrollIndicator={false}
        >
          <StyledView className="px-5 pb-8 pt-4">
            <DashboardHeader />
            <LeaderboardCard />
            <ElectionSection />
            <PollingUnitSection />
          </StyledView>
        </StyledScrollView>

        <BottomNav />
      </StyledView>
    </StyledSafeAreaView>
  );
}

function DashboardHeader() {
  return (
    <StyledView className="mb-6 flex-row items-center justify-between">
      <StyledView className="flex-row items-center">
        <StyledView className="mr-3 h-8 w-8 rounded-full bg-[#C68E56]" />
        <StyledText className="text-[16px] font-bold text-[#222021]">
          Hi Lotta, Free 9ja
        </StyledText>
      </StyledView>

      <StyledView className="flex-row items-center gap-4">
        <StyledView className="flex-row items-center">
          <StyledView className="mr-2 h-3.5 w-3.5 rounded-full bg-[#48BF74]" />
          <StyledText className="text-[14px] font-bold text-[#222021]">
            2.31m online
          </StyledText>
        </StyledView>

        <StyledView className="relative">
          <MaterialIcons name="notifications" size={22} color="#161415" />
          <StyledView className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-[#FF4768]">
            <StyledText className="text-[12px] font-bold text-white">3</StyledText>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}

function LeaderboardCard() {
  return (
    <StyledView className="mb-8 rounded-[24px] bg-[#121212] px-4 py-4">
      {LEADERS.map((leader, index) => (
        <StyledView
          key={leader.name}
          className={cn(
            "flex-row items-center py-3",
            index < LEADERS.length - 1 && "border-b border-white/8",
          )}
        >
          <StyledView
            className="mr-4 h-12 w-12 rounded-full border border-white/15"
            style={{ backgroundColor: leader.color }}
          />
          <StyledText className="flex-1 text-[16px] font-medium text-white">
            {leader.name}
          </StyledText>
          <StyledText className="mr-5 text-[16px] font-bold text-white">
            {leader.votes}
          </StyledText>
          <StyledText className="text-[16px] font-bold text-white/45">
            {leader.rank}
          </StyledText>
        </StyledView>
      ))}

      <StyledView className="mt-5">
        <Button
          label="Show all"
          className="h-[50px] rounded-[16px] bg-[#5D5D5D]"
        />
      </StyledView>
    </StyledView>
  );
}

function ElectionSection() {
  return (
    <StyledView className="mb-8">
      <StyledView className="mb-4 flex-row items-center justify-between">
        <StyledText className="text-[18px] font-bold text-[#343133]">
          Elections
        </StyledText>
        <StyledText className="text-[18px] font-bold text-[#343133]">
          3h:45m left
        </StyledText>
      </StyledView>

      <StyledScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        <StyledView className="flex-row gap-3">
          {ELECTIONS.map((item, index) => (
            <StyledView
              key={item}
              className={cn(
                "h-[50px] min-w-[145px] flex-row items-center justify-center rounded-[14px] px-4",
                index === 0 ? "bg-[#DDF1E7]" : "bg-[#F0EBEE]",
              )}
            >
              {index === 0 ? (
                <MaterialIcons
                  name="military-tech"
                  size={16}
                  color="#0B9D53"
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <StyledText
                className={cn(
                  "text-[16px] font-bold",
                  index === 0 ? "text-[#0B9D53]" : "text-[#656164]",
                )}
              >
                {item}
              </StyledText>
            </StyledView>
          ))}
        </StyledView>
      </StyledScrollView>
    </StyledView>
  );
}

function PollingUnitSection() {
  return (
    <StyledView>
      <StyledView className="mb-4 flex-row items-center justify-between">
        <StyledText className="text-[18px] font-bold text-[#343133]">
          My Polling Unit
        </StyledText>
        <StyledView className="flex-row items-center">
          <MaterialIcons
            name="link"
            size={16}
            color="#8B8589"
            style={{ marginRight: 6 }}
          />
          <StyledText className="text-[16px] font-bold text-[#8B8589]">
            Change
          </StyledText>
        </StyledView>
      </StyledView>

      <StyledView className="mb-5 flex-row items-center rounded-[18px] bg-[#DDD0FF] px-5 py-5">
        <StyledText className="mr-4 text-[22px]">🗳️</StyledText>
        <StyledText className="flex-1 text-[16px] font-medium text-[#222021]">
          PW Junction
        </StyledText>
        <StyledText className="text-[16px] font-bold text-[#222021]">
          302 votes
        </StyledText>
      </StyledView>

      <Button
        label="Upload Vote Result"
        className="mb-4 h-[58px] rounded-[18px] bg-[#6C54EA]"
      />

      <StyledView className="rounded-[18px] border border-[#FF4242] bg-white px-5 py-[18px]">
        <StyledView className="flex-row items-center justify-center">
          <MaterialIcons
            name="campaign"
            size={18}
            color="#F52828"
            style={{ marginRight: 10 }}
          />
          <StyledText className="text-[16px] font-bold text-[#1D2A24]">
            Report this Polling Unit
          </StyledText>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}

function BottomNav() {
  const insets = useSafeAreaInsets();

  return (
    <StyledView
      className="absolute bottom-0 left-0 right-0 border-t border-[#EFE7B7] bg-white px-6 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <StyledView className="flex-row items-end justify-between">
        {NAV_ITEMS.map((item) => (
          <StyledView key={item.label} className="items-center">
            <MaterialIcons
              name={item.icon}
              size={item.label === "Post" ? 30 : 25}
              color={item.active ? "#4E7161" : "#6E6B6D"}
            />
            <StyledText
              className={cn(
                "mt-1 text-[11px]",
                item.active ? "text-[#4E7161]" : "text-[#6E6B6D]",
              )}
            >
              {item.label}
            </StyledText>
          </StyledView>
        ))}
      </StyledView>
    </StyledView>
  );
}
