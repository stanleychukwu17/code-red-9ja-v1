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
type YesStep = "state" | "lga" | "pollingUnit" | "candidates" | "done";
type NoStep = "reason" | "details" | "done";
type CandidateGroupKey = "presidential" | "houseOfRep";

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

const NOT_VOTING_REASONS = [
  "Lack of Trust in the System",
  "Security Concerns",
  "My vote doesn’t matter",
  "Poor Electoral Logistics",
  "Difficult Voter Registration Process",
  "Economic Pressures",
];

const ILLUSTRATION =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";

export default function VotingIntentScreen() {
  const router = useRouter();
  const [initialChoice, setInitialChoice] = useState<InitialChoice>(null);
  const [yesStep, setYesStep] = useState<YesStep>("state");
  const [noStep, setNoStep] = useState<NoStep>("reason");
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("FCT (Abuja)");
  const [selectedLga, setSelectedLga] = useState("Abaji");
  const [selectedPollingUnit, setSelectedPollingUnit] =
    useState("KOFAR FADA DOKA");
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [candidateSelections, setCandidateSelections] = useState<
    Record<CandidateGroupKey, string>
  >({
    presidential: "Atiku Abubakar",
    houseOfRep: "Atiku Abubakar",
  });

  const headerTitle =
    initialChoice === null
      ? "Do you plan on voting this 2027 election?"
      : initialChoice === "yes"
        ? getYesStepTitle(yesStep)
        : getNoStepTitle(noStep);

  const continueDisabled =
    initialChoice === null
      ? !initialChoice
      : initialChoice === "yes"
        ? isYesContinueDisabled({
            step: yesStep,
            selectedState,
            selectedLga,
            selectedPollingUnit,
            candidateSelections,
          })
        : isNoContinueDisabled({ step: noStep, selectedReason, details });

  const visibleList = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const items =
      initialChoice === "yes" && yesStep === "state"
        ? STATES
        : initialChoice === "yes" && yesStep === "lga"
          ? (LGAS[selectedState as keyof typeof LGAS] ?? [])
          : initialChoice === "yes" && yesStep === "pollingUnit"
            ? (POLLING_UNITS[selectedLga as keyof typeof POLLING_UNITS] ?? [])
            : [];

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [initialChoice, search, selectedLga, selectedState, yesStep]);

  const handleBackPress = () => {
    if (initialChoice === null) {
      router.back();
      return;
    }

    if (initialChoice === "yes") {
      if (yesStep === "state") {
        setInitialChoice(null);
        return;
      }
      if (yesStep === "lga") {
        setYesStep("state");
        setSearch("");
        return;
      }
      if (yesStep === "pollingUnit") {
        setYesStep("lga");
        setSearch("");
        return;
      }
      if (yesStep === "candidates") {
        setYesStep("pollingUnit");
        return;
      }
      router.back();
      return;
    }

    if (noStep === "reason") {
      setInitialChoice(null);
      return;
    }
    if (noStep === "details") {
      setNoStep("reason");
      return;
    }
    router.back();
  };

  const handleContinuePress = () => {
    if (initialChoice === null) {
      return;
    }

    if (initialChoice === "yes") {
      if (yesStep === "state") {
        setYesStep("lga");
        setSearch("");
        return;
      }
      if (yesStep === "lga") {
        setYesStep("pollingUnit");
        setSearch("");
        return;
      }
      if (yesStep === "pollingUnit") {
        setYesStep("candidates");
        return;
      }
      if (yesStep === "candidates") {
        setYesStep("done");
        return;
      }
      router.back();
      return;
    }

    if (noStep === "reason") {
      setNoStep("details");
      return;
    }
    if (noStep === "details") {
      setNoStep("done");
      return;
    }
    router.back();
  };

  const handleClose = () => {
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

            {initialChoice === null ? (
              <InitialChoiceStep
                title={headerTitle}
                selectedChoice={initialChoice}
                onSelect={setInitialChoice}
              />
            ) : initialChoice === "yes" ? (
              yesStep === "done" ? (
                <ThankYouStep />
              ) : yesStep === "candidates" ? (
                <CandidatesStep
                  title={headerTitle}
                  selections={candidateSelections}
                  onSelect={(group, value) =>
                    setCandidateSelections((current) => ({
                      ...current,
                      [group]: value,
                    }))
                  }
                />
              ) : (
                <SelectionListStep
                  title={headerTitle}
                  search={search}
                  onSearchChange={setSearch}
                  items={visibleList}
                  selectedValue={
                    yesStep === "state"
                      ? selectedState
                      : yesStep === "lga"
                        ? selectedLga
                        : selectedPollingUnit
                  }
                  onSelect={(value) => {
                    if (yesStep === "state") {
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

                    if (yesStep === "lga") {
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
            ) : noStep === "done" ? (
              <ThankYouStep />
            ) : noStep === "details" ? (
              <DetailsStep
                title={headerTitle}
                value={details}
                onChangeText={setDetails}
              />
            ) : (
              <ReasonStep
                title={headerTitle}
                selectedReason={selectedReason}
                onSelect={setSelectedReason}
              />
            )}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 bg-background px-5 pb-6 pt-3">
            <Button
              label={
                isDoneStep(initialChoice, yesStep, noStep)
                  ? "Close"
                  : "Continue"
              }
              variant={
                isDoneStep(initialChoice, yesStep, noStep)
                  ? "secondary"
                  : "neutral"
              }
              size="lg"
              disabled={
                !isDoneStep(initialChoice, yesStep, noStep) && continueDisabled
              }
              className={cn(
                "h-[68px] rounded-[24px]",
                isDoneStep(initialChoice, yesStep, noStep)
                  ? "bg-[#2F7755]"
                  : continueDisabled
                    ? "bg-[#BDBDBD]"
                    : "bg-black",
              )}
              textClassName="text-[18px] font-bold text-white"
              onPress={
                isDoneStep(initialChoice, yesStep, noStep)
                  ? handleClose
                  : handleContinuePress
              }
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
        label="Yes, I will be voting"
        selected={selectedChoice === "yes"}
        onPress={() => onSelect("yes")}
      />
      <ChoiceCard
        label="No, I won’t be voting"
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
        {NOT_VOTING_REASONS.map((reason) => (
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
  onChangeText,
}: {
  title: string;
  value: string;
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
        placeholder="Say something..."
        placeholderTextColor="#B0A9AD"
        className="min-h-[190px] rounded-[24px] border-2 border-brand bg-transparent px-5 py-4 text-[18px] text-brand-deep"
      />
    </View>
  );
}

function ThankYouStep() {
  return (
    <View className="flex-1 items-center pt-20">
      <Image
        source={ILLUSTRATION}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: 180, height: 180, borderRadius: 999 }}
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

function getYesStepTitle(step: YesStep) {
  switch (step) {
    case "state":
      return "Which of the states will you be voting in?";
    case "lga":
      return "Which of the LGA will you be voting in?";
    case "pollingUnit":
      return "Which of the Polling Unit will you be voting in?";
    case "candidates":
      return "Who do you plan on voting for this election?";
    case "done":
      return "Thank you";
  }
}

function getNoStepTitle(step: NoStep) {
  switch (step) {
    case "reason":
      return "That’s sad. Why won’t you be voting?";
    case "details":
      return "Tell us more about why you won’t be voting";
    case "done":
      return "Thank you";
  }
}

function isYesContinueDisabled({
  step,
  selectedState,
  selectedLga,
  selectedPollingUnit,
  candidateSelections,
}: {
  step: YesStep;
  selectedState: string;
  selectedLga: string;
  selectedPollingUnit: string;
  candidateSelections: Record<CandidateGroupKey, string>;
}) {
  if (step === "state") return !selectedState;
  if (step === "lga") return !selectedLga;
  if (step === "pollingUnit") return !selectedPollingUnit;
  if (step === "candidates") {
    return !candidateSelections.presidential || !candidateSelections.houseOfRep;
  }
  return false;
}

function isNoContinueDisabled({
  step,
  selectedReason,
  details,
}: {
  step: NoStep;
  selectedReason: string;
  details: string;
}) {
  if (step === "reason") return !selectedReason;
  if (step === "details") return details.trim().length === 0;
  return false;
}

function isDoneStep(
  initialChoice: InitialChoice,
  yesStep: YesStep,
  noStep: NoStep,
) {
  return (
    (initialChoice === "yes" && yesStep === "done") ||
    (initialChoice === "no" && noStep === "done")
  );
}
