import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/app/screen-headers";
import { CandidateTile } from "@/components/app/tiles/candidate-tile";
import { PollingUnitTile } from "@/components/app/tiles/polling-unit-tile";
import { cn } from "@/components/ui/cn";
import { MetricBlock } from "./polling-unit-details";

const CANDIDATES = [
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
  {
    name: "Rabiu Kwankwaso",
    votes: "900.2k votes",
    rank: "#4",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  },
  {
    name: "Christopher Imu...",
    votes: "900.2k votes",
    rank: "#5",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    name: "Hamza al-Mustap...",
    votes: "900.2k votes",
    rank: "#6",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
  },
  {
    name: "Yabagi Sani",
    votes: "900.2k votes",
    rank: "#7",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop",
  },
  {
    name: "Osita Nnadi",
    votes: "900.2k votes",
    rank: "#8",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  },
];

const POLLING_UNITS = [
  "KOFAR FADA DOKA",
  "MARBINI DISPENSARY",
  "OPEN SPACE TENBIRI",
  "TSE ATIM JUNCTION",
  "NEAR DOCTOR KUNDE",
  "INFRONT OF GARDEN...",
  "OPP. APOSTOLIC NUR...",
  "MUSA VILLAGE",
];

const LEAD_IMAGE = "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg";

export default function StateDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ state?: string }>();
  const [tab, setTab] = useState<"Home" | "Polling units">("Home");
  const stateName = params.state ?? "Lagos";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={`${stateName} State`}
          onBackPress={() => router.back()}
          showBackButton
          className="px-5"
        />
        <View className="px-5 pt-4">
          <View className="mb-6 flex-row items-start justify-between">
            <View className="pr-4">
              <View className="flex-1">
                <Text className="text-[18px] text-[#8A8588]">State</Text>
                <Text className="mt-2 text-[32px] font-bold leading-[36px] text-brand">
                  {stateName}
                </Text>
              </View>

              <View className="mt-6 flex-row items-center">
                <MetricBlock value="2,112,382" label="Votes" />
                <View className="mx-6 h-6 w-px bg-[#D8D2D5]" />
                <MetricBlock value="102,011" label="Polling units" />
              </View>
            </View>

            <View className="relative mt-3">
              <Image
                source={LEAD_IMAGE}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={{ width: 100, height: 100, borderRadius: 999 }}
              />
              <View className="absolute bottom-1 right-0 h-9 w-9 items-center justify-center rounded-full bg-[#D5E2DA]">
                <Text className="text-[16px] font-bold text-black">#1</Text>
              </View>
            </View>
          </View>

          <View className="mb-6 h-12 flex-row items-center justify-between rounded-[8px] bg-[#FFE39B] px-5">
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

          <View className="mb-5 flex-row rounded-[16px] bg-[#ECE8EC] py-1">
            {(["Home", "Polling units"] as const).map((item) => {
              const active = tab === item;

              return (
                <Pressable
                  key={item}
                  className={cn(
                    "flex-1 flex-row items-center justify-between rounded-[12px] px-4 py-3",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                  onPress={() => setTab(item)}
                >
                  <Text
                    className={cn(
                      "text-[16px]",
                      active ? "text-white" : "text-[#1D1B1C]",
                    )}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === "Home" ? (
            <View>
              {CANDIDATES.map((candidate) => (
                <CandidateTile
                  key={candidate.name}
                  name={candidate.name}
                  votes={candidate.votes}
                  rank={candidate.rank}
                  image={candidate.image}
                  onPress={() =>
                    router.push({
                      pathname: "/user-profile",
                      params: { name: candidate.name },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <View>
              {POLLING_UNITS.map((unit) => (
                <PollingUnitTile
                  key={unit}
                  className="py-5"
                  name={unit}
                  image={LEAD_IMAGE}
                  votes="4,308"
                  rank="#4"
                  onPress={() =>
                    router.push({
                      pathname: "/polling-unit-details",
                      params: { state: stateName, unit },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({
  title,
  onBackPress,
}: {
  title: string;
  onBackPress: () => void;
}) {
  return (
    <View className="relative mb-2 h-12 items-center justify-center">
      <Pressable
        className="absolute left-0 h-12 w-12 items-start justify-center"
        hitSlop={8}
        onPress={onBackPress}
      >
        <MaterialIcons name="arrow-back-ios-new" size={18} color="#464043" />
      </Pressable>
      <Text className="text-[20px] font-bold text-[#302D2F]">{title}</Text>
    </View>
  );
}
