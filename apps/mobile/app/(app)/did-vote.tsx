import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

type InitialChoice = "yes" | "no" | null;
type VotedStep =
  | "state"
  | "lga"
  | "pollingUnit"
  | "candidates"
  | "resultCheck"
  | "resultReason"
  | "done";
type DidNotVoteStep = "reason" | "details" | "done";
type CandidateGroupKey = "presidential" | "houseOfRep";
type ResultChoice = "yes" | "no" | null;

const STATES = ["FCT (Abuja)", "Abia", "Adamawa", "Anambara", "Bauchi"];

const LGAS = {
  "FCT (Abuja)": [
    "Abaji",
    "Abuja Municipal Area Council (AMAC)",
    "Bwari",
    "Gwagwalada",
    "Kuje",
  ],
  Abia: ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano"],
  Adamawa: ["Demsa", "Fufore", "Ganye", "Girei", "Gombi"],
  Anambara: ["Aguata", "Awka North", "Awka South", "Dunukofia", "Idemili"],
  Bauchi: ["Alkaleri", "Bauchi", "Bogoro", "Dass", "Gamawa"],
} as const;

const POLLING_UNITS = {
  Abaji: [
    "KOFAR FADA DOKA",
    "MARBINI DISPENSARY",
    "OPEN SPACE TENBIRI",
    "TSE ATIM JUNCTION",
    "NEAR DOCTOR KUNDE",
  ],
  "Abuja Municipal Area Council (AMAC)": [
    "PW JUNCTION",
    "AREA 1 OPEN SPACE",
    "WUSE PRIMARY SCHOOL",
    "JABI MARKET SQUARE",
    "DURUMI CENTRAL",
  ],
  Bwari: [
    "USHAFA PRIMARY SCHOOL",
    "KUBWA COMMUNITY HALL",
    "DUTSE JUNCTION",
    "BWARI TOWN HALL",
    "DEI-DEI MARKET FRONT",
  ],
  Gwagwalada: [
    "STAFF QUARTERS GATE",
    "GWAGWALADA MARKET",
    "UNIVERSITY ROAD",
    "PAIKO JUNCTION",
    "ANGWAN DODO",
  ],
  Kuje: [
    "KUJE TOWN HALL",
    "YANGOJI OPEN SPACE",
    "RUBOCHI PRIMARY SCHOOL",
    "CHIBIRI JUNCTION",
    "GAUBE CENTER",
  ],
} as const;

const CANDIDATE_GROUPS: {
  key: CandidateGroupKey;
  title: string;
  options: { name: string; image: string }[];
}[] = [
  {
    key: "presidential",
    title: "Presidential",
    options: [
      {
        name: "Atiku Abubakar",
        image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      },
      {
        name: "Peter Obi",
        image:
          "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
      },
      {
        name: "Bola Tinibu",
        image:
          "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
      },
    ],
  },
  {
    key: "houseOfRep",
    title: "House of Rep",
    options: [
      {
        name: "Atiku Abubakar",
        image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      },
      {
        name: "Peter Obi",
        image:
          "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
      },
      {
        name: "Bola Tinibu",
        image:
          "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
      },
    ],
  },
];

const DID_NOT_VOTE_REASONS = [
  "Not registered",
  "No voter card",
  "Couldn’t reach polling unit",
  "Work or time conflict",
  "Long queues",
  "Security concerns",
];

const RESULT_ROWS = [
  {
    name: "Atiku Abubakar",
    votes: "212",
    rank: "#1",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Peter Obi",
    votes: "101",
    rank: "#2",
    image:
      "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Bola Tinibu",
    votes: "102",
    rank: "#3",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
] as const;

const ILLUSTRATION =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";

export default function DidVoteScreen() {
  const router = useRouter();
  const [initialChoice, setInitialChoice] = useState<InitialChoice>(null);
  const [votedStep, setVotedStep] = useState<VotedStep>("state");
  const [didNotVoteStep, setDidNotVoteStep] = useState<DidNotVoteStep>("reason");
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("FCT (Abuja)");
  const [selectedLga, setSelectedLga] = useState("Abaji");
  const [selectedPollingUnit, setSelectedPollingUnit] =
    useState("KOFAR FADA DOKA");
  const [didNotVoteReason, setDidNotVoteReason] = useState("");
  const [didNotVoteDetails, setDidNotVoteDetails] = useState("");
  const [candidateSelections, setCandidateSelections] = useState<
    Record<CandidateGroupKey, string>
  >({
    presidential: "Atiku Abubakar",
    houseOfRep: "Atiku Abubakar",
  });
  const [resultChoice, setResultChoice] = useState<ResultChoice>(null);
  const [resultReason, setResultReason] = useState("");

  const title =
    initialChoice === null
      ? "Hello there. Did you later vote this 2027 election?"
      : initialChoice === "yes"
        ? getVotedTitle(votedStep)
        : getDidNotVoteTitle(didNotVoteStep);

  const listItems = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const items =
      initialChoice === "yes" && votedStep === "state"
        ? STATES
        : initialChoice === "yes" && votedStep === "lga"
          ? (LGAS[selectedState as keyof typeof LGAS] ?? [])
          : initialChoice === "yes" && votedStep === "pollingUnit"
            ? (POLLING_UNITS[selectedLga as keyof typeof POLLING_UNITS] ?? [])
            : [];

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [initialChoice, search, selectedLga, selectedState, votedStep]);

  const isDone =
    (initialChoice === "yes" && votedStep === "done") ||
    (initialChoice === "no" && didNotVoteStep === "done");

  const continueDisabled =
    initialChoice === null
      ? true
      : initialChoice === "yes"
        ? getVotedDisabled({
            step: votedStep,
            selectedState,
            selectedLga,
            selectedPollingUnit,
            selections: candidateSelections,
            resultChoice,
            resultReason,
          })
        : getDidNotVoteDisabled({
            step: didNotVoteStep,
            reason: didNotVoteReason,
            details: didNotVoteDetails,
          });

  const handleBackPress = () => {
    if (initialChoice === null) {
      router.back();
      return;
    }

    if (initialChoice === "yes") {
      if (votedStep === "state") {
        setInitialChoice(null);
        return;
      }
      if (votedStep === "lga") {
        setVotedStep("state");
        setSearch("");
        return;
      }
      if (votedStep === "pollingUnit") {
        setVotedStep("lga");
        setSearch("");
        return;
      }
      if (votedStep === "candidates") {
        setVotedStep("pollingUnit");
        return;
      }
      if (votedStep === "resultCheck") {
        setVotedStep("candidates");
        return;
      }
      if (votedStep === "resultReason") {
        setVotedStep("resultCheck");
        return;
      }
      router.back();
      return;
    }

    if (didNotVoteStep === "reason") {
      setInitialChoice(null);
      return;
    }
    if (didNotVoteStep === "details") {
      setDidNotVoteStep("reason");
      return;
    }
    router.back();
  };

  const handleContinuePress = () => {
    if (initialChoice === null) {
      return;
    }

    if (initialChoice === "yes") {
      if (votedStep === "state") {
        setVotedStep("lga");
        setSearch("");
        return;
      }
      if (votedStep === "lga") {
        setVotedStep("pollingUnit");
        setSearch("");
        return;
      }
      if (votedStep === "pollingUnit") {
        setVotedStep("candidates");
        return;
      }
      if (votedStep === "candidates") {
        setVotedStep("resultCheck");
        return;
      }
      if (votedStep === "resultCheck") {
        setVotedStep(resultChoice === "yes" ? "done" : "resultReason");
        return;
      }
      if (votedStep === "resultReason") {
        setVotedStep("done");
        return;
      }
      router.back();
      return;
    }

    if (didNotVoteStep === "reason") {
      setDidNotVoteStep("details");
      return;
    }
    if (didNotVoteStep === "details") {
      setDidNotVoteStep("done");
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 140,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isDone ? (
              <Pressable
                className="mb-10 h-12 w-12 items-start justify-center"
                onPress={handleBackPress}
              >
                <MaterialIcons
                  name="arrow-back-ios-new"
                  size={18}
                  color="#464043"
                />
              </Pressable>
            ) : null}

            {initialChoice === null ? (
              <InitialChoiceStep
                title={title}
                selectedChoice={initialChoice}
                onSelect={setInitialChoice}
              />
            ) : initialChoice === "yes" ? (
              votedStep === "done" ? (
                <ThankYouStep />
              ) : votedStep === "candidates" ? (
                <CandidatesStep
                  title={title}
                  selections={candidateSelections}
                  onSelect={(group, value) =>
                    setCandidateSelections((current) => ({
                      ...current,
                      [group]: value,
                    }))
                  }
                />
              ) : votedStep === "resultCheck" ? (
                <ResultCheckStep
                  title={title}
                  resultChoice={resultChoice}
                  onSelect={setResultChoice}
                />
              ) : votedStep === "resultReason" ? (
                <DetailsStep
                  title={title}
                  value={resultReason}
                  placeholder="Tell us more..."
                  onChangeText={setResultReason}
                />
              ) : (
                <SelectionListStep
                  title={title}
                  search={search}
                  onSearchChange={setSearch}
                  items={listItems}
                  selectedValue={
                    votedStep === "state"
                      ? selectedState
                      : votedStep === "lga"
                        ? selectedLga
                        : selectedPollingUnit
                  }
                  onSelect={(value) => {
                    if (votedStep === "state") {
                      setSelectedState(value);
                      const nextLga =
                        LGAS[value as keyof typeof LGAS]?.[0] ?? "";
                      setSelectedLga(nextLga);
                      setSelectedPollingUnit(
                        nextLga
                          ? (POLLING_UNITS[
                              nextLga as keyof typeof POLLING_UNITS
                            ]?.[0] ?? "")
                          : "",
                      );
                      return;
                    }

                    if (votedStep === "lga") {
                      setSelectedLga(value);
                      setSelectedPollingUnit(
                        POLLING_UNITS[
                          value as keyof typeof POLLING_UNITS
                        ]?.[0] ?? "",
                      );
                      return;
                    }

                    setSelectedPollingUnit(value);
                  }}
                />
              )
            ) : didNotVoteStep === "done" ? (
              <ThankYouStep />
            ) : didNotVoteStep === "details" ? (
              <DetailsStep
                title={title}
                value={didNotVoteDetails}
                placeholder="Say something..."
                onChangeText={setDidNotVoteDetails}
              />
            ) : (
              <ReasonStep
                title={title}
                selectedReason={didNotVoteReason}
                onSelect={setDidNotVoteReason}
              />
            )}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 bg-background px-5 pb-6 pt-3">
            <Button
              label={isDone ? "Close" : "Continue"}
              variant={
                isDone ||
                (initialChoice === "no" && didNotVoteStep === "details")
                  ? "secondary"
                  : "neutral"
              }
              size="lg"
              disabled={!isDone && continueDisabled}
              className={cn(
                "h-[68px] rounded-[24px]",
                isDone ||
                  (initialChoice === "no" && didNotVoteStep === "details")
                  ? "bg-[#2F7755]"
                  : !isDone && continueDisabled
                    ? "bg-[#BDBDBD]"
                    : "bg-black",
              )}
              textClassName="text-[18px] font-bold text-white"
              onPress={isDone ? () => router.back() : handleContinuePress}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InitialChoiceStep({
  title,
  selectedChoice,
  onSelect,
}: {
  title: string;
  selectedChoice: InitialChoice;
  onSelect: (value: Exclude<InitialChoice, null>) => void;
}) {
  return (
    <View>
      <Text className="mb-10 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      <ChoiceCard
        label="Yes, I voted"
        selected={selectedChoice === "yes"}
        onPress={() => onSelect("yes")}
      />
      <ChoiceCard
        label="No, I did not vote"
        selected={selectedChoice === "no"}
        onPress={() => onSelect("no")}
      />
    </View>
  );
}

function SelectionListStep({
  title,
  search,
  onSearchChange,
  items,
  selectedValue,
  onSelect,
}: {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  items: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-8 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      <View className="mb-6 flex-row items-center rounded-[18px] bg-surface-muted px-4 py-4">
        <MaterialIcons name="search" size={24} color="#8B8589" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search..."
          placeholderTextColor="#7A767A"
          className="ml-4 flex-1 text-[18px] text-[#1D1B1C]"
        />
      </View>

      <View className="gap-3">
        {items.map((item) => (
          <SelectionCard
            key={item}
            label={item}
            selected={item === selectedValue}
            onPress={() => onSelect(item)}
          />
        ))}
      </View>
    </View>
  );
}

function CandidatesStep({
  title,
  selections,
  onSelect,
}: {
  title: string;
  selections: Record<CandidateGroupKey, string>;
  onSelect: (group: CandidateGroupKey, value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-8 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      {CANDIDATE_GROUPS.map((group) => (
        <View key={group.key} className="mb-8">
          <Text className="mb-4 text-[16px] font-bold text-[#6D696D]">
            {group.title}
          </Text>
          <View className="gap-3">
            {group.options.map((option) => (
              <SelectionCard
                key={`${group.key}-${option.name}`}
                label={option.name}
                selected={selections[group.key] === option.name}
                image={option.image}
                onPress={() => onSelect(group.key, option.name)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ReasonStep({
  title,
  selectedReason,
  onSelect,
}: {
  title: string;
  selectedReason: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-8 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      <View className="gap-3">
        {DID_NOT_VOTE_REASONS.map((reason) => (
          <SelectionCard
            key={reason}
            label={reason}
            selected={selectedReason === reason}
            onPress={() => onSelect(reason)}
          />
        ))}
      </View>
    </View>
  );
}

function DetailsStep({
  title,
  value,
  placeholder,
  onChangeText,
}: {
  title: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-8 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        placeholderTextColor="#B0A9AD"
        className="min-h-[190px] rounded-[24px] border-2 border-brand bg-transparent px-5 py-4 text-[18px] text-brand-deep"
      />
    </View>
  );
}

function ResultCheckStep({
  title,
  resultChoice,
  onSelect,
}: {
  title: string;
  resultChoice: ResultChoice;
  onSelect: (value: Exclude<ResultChoice, null>) => void;
}) {
  return (
    <View>
      <Text className="mb-8 text-[24px] font-bold leading-[42px] text-brand-deep">
        {title}
      </Text>

      <View className="gap-4">
        <SelectionCard
          label="Yes, this is the result."
          selected={resultChoice === "yes"}
          onPress={() => onSelect("yes")}
        />
        <SelectionCard
          label="No, this is not the result."
          selected={resultChoice === "no"}
          onPress={() => onSelect("no")}
        />
      </View>

      <View className="mt-10">
        <Text className="mb-5 text-[16px] font-bold text-[#6D696D]">
          Presidential
        </Text>

        <View className="gap-4">
          {RESULT_ROWS.map((row) => (
            <View key={row.name} className="flex-row items-center">
              <Image
                source={row.image}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={{ width: 40, height: 40, borderRadius: 999, marginRight: 16 }}
              />
              <Text className="flex-1 text-[16px] text-[#1D1B1C]">{row.name}</Text>
              <Text className="mr-5 text-[16px] font-bold text-[#1D1B1C]">
                {row.votes}
              </Text>
              <Text className="text-[16px] font-bold text-black/45">
                {row.rank}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label="See all"
          variant="outline"
          size="lg"
          className="mt-6 h-[60px] rounded-[18px] border-[#D8D1D4] bg-white"
          textClassName="text-[18px] font-bold text-[#173028]"
        />
      </View>
    </View>
  );
}

function ThankYouStep() {
  return (
    <View className="flex-1 items-center pt-24">
      <Image
        source={ILLUSTRATION}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: 200, height: 200, borderRadius: 999 }}
      />
      <Text className="mt-10 text-[28px] font-bold text-brand-deep">DONE</Text>
      <Text className="mt-4 text-[18px] text-[#8B8589]">
        Thank you for your response!
      </Text>
    </View>
  );
}

function ChoiceCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <SelectionCard
      label={label}
      selected={selected}
      image={ILLUSTRATION}
      onPress={onPress}
    />
  );
}

function SelectionCard({
  label,
  selected,
  onPress,
  image,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  image?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "min-h-[86px] flex-row items-center rounded-[20px] px-5 py-5",
        selected ? "bg-[#C9F1E4]" : "bg-[#F1EEF3]",
      )}
    >
      <Text className="flex-1 text-[18px] leading-8 text-[#1D1B1C]">
        {label}
      </Text>
      {image ? (
        <Image
          source={image}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: 44, height: 44, borderRadius: 999, marginLeft: 12 }}
        />
      ) : null}
    </Pressable>
  );
}

function getVotedTitle(step: VotedStep) {
  switch (step) {
    case "state":
      return "Which of the states did you vote in?";
    case "lga":
      return "Which of the LGA did you vote in?";
    case "pollingUnit":
      return "Which of the Polling Unit did you vote in?";
    case "candidates":
      return "Which of the candidates did you vote for?";
    case "resultCheck":
      return "Do you agree with your polling unit result?";
    case "resultReason":
      return "What makes you say this is not the result?";
    case "done":
      return "Thank you";
  }
}

function getDidNotVoteTitle(step: DidNotVoteStep) {
  switch (step) {
    case "reason":
      return "That’s sad. Why did you not vote?";
    case "details":
      return "Tell us more about why you did not vote";
    case "done":
      return "Thank you";
  }
}

function getVotedDisabled({
  step,
  selectedState,
  selectedLga,
  selectedPollingUnit,
  selections,
  resultChoice,
  resultReason,
}: {
  step: VotedStep;
  selectedState: string;
  selectedLga: string;
  selectedPollingUnit: string;
  selections: Record<CandidateGroupKey, string>;
  resultChoice: ResultChoice;
  resultReason: string;
}) {
  if (step === "state") return !selectedState;
  if (step === "lga") return !selectedLga;
  if (step === "pollingUnit") return !selectedPollingUnit;
  if (step === "candidates") {
    return !selections.presidential || !selections.houseOfRep;
  }
  if (step === "resultCheck") return !resultChoice;
  if (step === "resultReason") return resultReason.trim().length === 0;
  return false;
}

function getDidNotVoteDisabled({
  step,
  reason,
  details,
}: {
  step: DidNotVoteStep;
  reason: string;
  details: string;
}) {
  if (step === "reason") return !reason;
  if (step === "details") return details.trim().length === 0;
  return false;
}
