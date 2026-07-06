import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/components/ui/cn";
import { ScreenHeader } from "@/components/app/screen-headers";

const USER_ROWS = [
  "FCT (Abuja)",
  "Abia",
  "Adamawa",
  "Anambara",
  "Bauchi",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
];

const DIASPORA_ROWS = [
  { flag: "🇺🇸", name: "United States" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇹🇷", name: "Turkey" },
  { flag: "🇨🇾", name: "Cyprus" },
  { flag: "🇮🇱", name: "Israel" },
  { flag: "🇿🇦", name: "South Africa" },
  { flag: "🇷🇺", name: "Russia" },
];

export default function AppUsersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Home" | "Diaspora">("Home");

  const rows = activeTab === "Home" ? USER_ROWS : DIASPORA_ROWS;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="App Users"
          onBackPress={() => router.back()}
          showBackButton
        />
        <View>
          <View className="items-center pb-10 pt-8">
            <Text className="text-[48px] font-bold leading-[64px] text-brand">
              4,608,908
            </Text>
            <View className="mt-4 flex-row items-center">
              <MaterialIcons
                name="public"
                size={20}
                color="#1EBA68"
                style={{ marginRight: 8 }}
              />
              <Text className="text-[16px] font-medium text-[#242123]">
                Online users
              </Text>
            </View>
          </View>
        </View>

        <View className="-mx-5 rounded-t-[20px] bg-white px-5 pb-6 pt-5">
          <View className="mx-4 mb-4 flex-row rounded-[14px] bg-[#ECECEC] p-1">
            <Segment
              label="Home"
              value="4.3m"
              active={activeTab === "Home"}
              onPress={() => setActiveTab("Home")}
            />
            <Segment
              label="Diaspora"
              value="4.3m"
              active={activeTab === "Diaspora"}
              onPress={() => setActiveTab("Diaspora")}
            />
          </View>

          {rows.map((item) => (
            <View
              key={typeof item === "string" ? item : item.name}
              className="px-6 flex-row items-center justify-between py-5"
            >
              <View className="flex-row items-center">
                {typeof item === "string" ? null : (
                  <Text className="mr-5 text-[22px]">{item.flag}</Text>
                )}
                <Text className="text-[18px] text-[#242123]">
                  {typeof item === "string" ? item : item.name}
                </Text>
              </View>
              <Text className="text-[18px] font-bold text-[#242123]">
                4,308
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Segment({
  label,
  value,
  active = false,
  onPress,
}: {
  label: string;
  value: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-1 flex-row items-center justify-between rounded-[12px] px-4 py-3",
        active ? "bg-primary" : "bg-transparent",
      )}
    >
      <Text
        className={cn("text-[16px]", active ? "text-white" : "text-black/80")}
      >
        {label}
      </Text>
      <Text
        className={cn(
          "text-[16px] font-bold",
          active ? "text-white" : "text-black/80",
        )}
      >
        {value}
      </Text>
    </Pressable>
  );
}
