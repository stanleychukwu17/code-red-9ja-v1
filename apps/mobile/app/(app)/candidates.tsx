import { ScreenHeader } from "@/components/app/screen-headers";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CandidateTile } from "@/components/app/tiles/candidate-tile";

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
    name: "Christopher Imumolen",
    votes: "900.2k votes",
    rank: "#5",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  },
  {
    name: "Hamza al-Mustapha",
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

export default function CandidatesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Candidates"
          onBackPress={() => router.back()}
          showBackButton
        />
        <View>
          <View className="px-4 mb-5 mt-4 flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[18px] text-[#8A8588]">2026</Text>
              <Text className="mt-2 text-[32px] font-bold leading-[36px] text-brand">
                Presidential Election
              </Text>
            </View>
            <View className="relative">
              <Image
                source={CANDIDATES[0].image}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={{ width: 100, height: 100, borderRadius: 999 }}
              />
              <View className="absolute bottom-1 right-0 h-9 w-9 items-center justify-center rounded-full bg-primary bg-[#D5E2DA]* backdrop-blur-xl">
                <Text className="text-[16px] font-bold text-black">#1</Text>
              </View>
            </View>
          </View>

          <View className="mx-4 mb-3 flex-row items-center justify-between rounded-[12px] bg-[#E5ECFD] px-5 py-5">
            <Text className="text-[18px] font-medium text-[#1B1A1B]">
              5.5m total votes
            </Text>
            <Text className="text-[18px] font-medium text-[#5191FF]">
              4 hours, 33 min left
            </Text>
          </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
