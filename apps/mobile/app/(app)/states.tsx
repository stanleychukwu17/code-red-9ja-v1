import { ScreenHeader } from "@/components/app/screen-headers";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATES = [
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
  { name: "Enugu", image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg" },
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
  { name: "Borno", image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg" },
  { name: "Benin", image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg" },
  { name: "Abia", image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg" },
  {
    name: "Adamawa",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Ebonyi",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
];

export default function StatesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="States"
          onBackPress={() => router.back()}
          showBackButton
        />
        <View className="pt-4">
          <View className="mx-4 mb-4 flex-row items-center justify-between rounded-[12px] bg-[#E5ECFD] px-5 py-5">
            <Text className="text-[18px] font-medium text-[#1B1A1B]">
              5.5m total votes
            </Text>
            <Text className="text-[18px] font-medium text-[#5191FF]">
              4 hours, 33 min left
            </Text>
          </View>
          <View className="px-4">
            {STATES.map((state) => (
              <Pressable
                key={state.name}
                className="flex-row items-center h-16"
                onPress={() =>
                  router.push({
                    pathname: "/state-details",
                    params: { state: state.name },
                  })
                }
              >
                <Text className="flex-1 text-[17px] text-black/80">
                  {state.name}
                </Text>
                <Image
                  source={state.image}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    marginRight: 18,
                  }}
                />
                <Text className="mr-6 text-[17px] font-bold text-black/80">
                  2.8m votes
                </Text>
                <Text className="text-[17px] font-bold text-black/40">#1</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
