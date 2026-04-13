import { useRouter } from "expo-router";
import {
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { AppAvatar, SearchTabs } from "@/components/app/social-primitives";
import { SearchInput } from "@/components/ui/search-input";
import { PollingUnitTile } from "@/components/app/tiles/polling-unit-tile";

const POLLING_UNIT_LEAD_IMAGE =
  "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg";

type SearchTab = "People" | "Polling Unit" | "State";

type PersonResult = {
  type: "People";
  name: string;
  subtitle: string;
  color: string;
};

type PollingUnitResult = {
  type: "Polling Unit";
  name: string;
  subtitle: string;
  state: string;
  unit: string;
  votes: string;
};

type StateResult = {
  type: "State";
  name: string;
  subtitle: string;
  votes: string;
  rank: string;
  image: string;
};

const PEOPLE_RESULTS: PersonResult[] = [
  {
    name: "Emeka Eze",
    subtitle: "NYSC Camp Junction",
    color: "#C9A96E",
    type: "People",
  },
  {
    name: "Zainab Bello",
    subtitle: "PW Junction",
    color: "#4A6F9D",
    type: "People",
  },
  {
    name: "Sadiq Lawal",
    subtitle: "KOFAR FADA DOKA",
    color: "#8A6A4A",
    type: "People",
  },
  {
    name: "Fatima Sani",
    subtitle: "Area 1 Open Space",
    color: "#B5B5B5",
    type: "People",
  },
  {
    name: "Ngozi Obi",
    subtitle: "Wuse Primary School",
    color: "#B86E52",
    type: "People",
  },
  {
    name: "Tunde Balogun",
    subtitle: "Jabi Market Square",
    color: "#7D6B5C",
    type: "People",
  },
];

const POLLING_UNIT_RESULTS: PollingUnitResult[] = [
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
];

const STATE_RESULTS: StateResult[] = [
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
];

function UserTile({
  result,
  onPress,
}: {
  result: PersonResult;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="px-4 h-16 gap-3 flex-row items-center"
      onPress={onPress}
    >
      <AppAvatar
        name={result.name}
        size={44}
        color={result.color}
        textClassName="text-sm"
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-[16px] font-medium text-[#161315]">
          {result.name}
        </Text>
        <Text className="text-[12px] text-[#8B8589]">{result.subtitle}</Text>
      </View>
    </Pressable>
  );
}

function StateTile({
  result,
  onPress,
}: {
  result: StateResult;
  onPress: () => void;
}) {
  return (
    <Pressable className="px-4 h-16 flex-row items-center" onPress={onPress}>
      <View className="flex-1">
        <Text className="text-[16px] text-black/80">{result.name}</Text>
      </View>

      <Text className="text-[16px] font-bold text-black/80">
        {result.votes}
      </Text>
      <Text className="text-[16px] text-right w-10 font-bold text-black/40">
        {result.rank}
      </Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("People");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source =
      activeTab === "People"
        ? PEOPLE_RESULTS
        : activeTab === "Polling Unit"
          ? POLLING_UNIT_RESULTS
          : STATE_RESULTS;

    if (!normalizedQuery) {
      return source;
    }

    return source.filter((item) =>
      [item.name, item.subtitle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [activeTab, query]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 pb-3 pt-4">
            <SearchInput value={query} onChangeText={setQuery} />
          </View>

          <SearchTabs active={activeTab} onChange={setActiveTab} />

          <View>
            {results.map((result) =>
              result.type === "People" ? (
                <UserTile
                  key={result.name}
                  result={result}
                  onPress={() =>
                    router.push({
                      pathname: "/user-profile",
                      params: { name: result.name },
                    })
                  }
                />
              ) : result.type === "Polling Unit" ? (
                <PollingUnitTile
                  key={result.name}
                  name={result.name}
                  votes={result.votes}
                  rank="#4"
                  image={POLLING_UNIT_LEAD_IMAGE}
                  onPress={() =>
                    router.push({
                      pathname: "/polling-unit-details",
                      params: { state: result.state, unit: result.unit },
                    })
                  }
                />
              ) : (
                <StateTile
                  key={result.name}
                  result={result}
                  onPress={() =>
                    router.push({
                      pathname: "/state-details",
                      params: { state: result.name },
                    })
                  }
                />
              ),
            )}
          </View>
        </ScrollView>

        <AppBottomNav />
      </View>
    </SafeAreaView>
  );
}
