import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import type { BottomSheetModalProps } from "@gorhom/bottom-sheet";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;
const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;
const StyledScrollView = ScrollView as unknown as ComponentType<
  ScrollViewProps & { className?: string }
>;
const StyledTextInput = TextInput as unknown as ComponentType<
  TextInputProps & { className?: string }
>;

type FlowStep = "state" | "lga" | "pollingUnit" | "candidates";

type Candidate = {
  name: string;
  image: string;
};

type VotingSelections = {
  presidential: Candidate["name"];
  houseOfRep: Candidate["name"];
};

type ChangePollingUnitSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    state: string;
    lga: string;
    pollingUnit: string;
    votes: VotingSelections;
  }) => void;
};

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

const CANDIDATES: Candidate[] = [
  {
    name: "Atiku Abubakar",
    image: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  },
  {
    name: "Peter Obi",
    image: "https://www.thecable.ng/wp-content/uploads/2024/09/Peter-Obi-.jpeg",
  },
  {
    name: "Bola Tinibu",
    image:
      "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2023/05/President-Bola-Tinubu-Picture-.jpg",
  },
];

export function ChangePollingUnitSheet({
  visible,
  onClose,
  onSubmit,
}: ChangePollingUnitSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const [step, setStep] = useState<FlowStep>("state");
  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState("FCT (Abuja)");
  const [selectedLga, setSelectedLga] = useState("Abaji");
  const [selectedPollingUnit, setSelectedPollingUnit] =
    useState("KOFAR FADA DOKA");
  const [votePlan, setVotePlan] = useState<VotingSelections>({
    presidential: "Atiku Abubakar",
    houseOfRep: "Atiku Abubakar",
  });

  useEffect(() => {
    if (visible) {
      setStep("state");
      setQuery("");
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  const stepConfig = getStepConfig(step);
  const listItems = getFilteredItems({
    step,
    query,
    selectedState,
    selectedLga,
  });

  const canContinue =
    step === "state"
      ? !!selectedState
      : step === "lga"
        ? !!selectedLga
        : step === "pollingUnit"
          ? !!selectedPollingUnit
          : true;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.14}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#E7E1E4",
        width: 40,
        height: 4,
      }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <StyledView className="flex-1 bg-white px-4 pb-6 pt-4">
          <StyledView className="mb-8 flex-row items-center justify-between">
            <StyledPressable
              hitSlop={8}
              onPress={() => modalRef.current?.dismiss()}
            >
              <MaterialIcons name="close" size={26} color="#676266" />
            </StyledPressable>
            <StyledView className="w-6" />
          </StyledView>

          <StyledText className="mb-8 text-[24px] font-bold leading-9 text-brand-deep">
            {stepConfig.title}
          </StyledText>

          {step !== "candidates" ? (
            <>
              <StyledView className="mb-7 flex-row items-center rounded-[18px] bg-[#EBE8EC] px-4 py-4">
                <MaterialIcons name="search" size={26} color="#848084" />
                <StyledTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor="#7A767A"
                  className="ml-4 flex-1 text-xl text-[#1D1B1C]"
                />
              </StyledView>

              <StyledScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {listItems.map((item) => {
                  const selected = isSelectedItem({
                    step,
                    item,
                    selectedState,
                    selectedLga,
                    selectedPollingUnit,
                  });

                  return (
                    <SelectionCard
                      key={item}
                      label={item}
                      selected={selected}
                      onPress={() => {
                        if (step === "state") {
                          setSelectedState(item);
                          const nextLga =
                            LGAS[item as keyof typeof LGAS]?.[0] ?? "";
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
                        if (step === "lga") {
                          setSelectedLga(item);
                          setSelectedPollingUnit(
                            POLLING_UNITS[
                              item as keyof typeof POLLING_UNITS
                            ]?.[0] ?? "",
                          );
                          return;
                        }
                        setSelectedPollingUnit(item);
                      }}
                    />
                  );
                })}
              </StyledScrollView>

              <Button
                label="Continue"
                variant="neutral"
                size="lg"
                className="mt-4 h-[60px] rounded-[22px] bg-black"
                disabled={!canContinue}
                onPress={() => {
                  setQuery("");
                  setStep(
                    step === "state"
                      ? "lga"
                      : step === "lga"
                        ? "pollingUnit"
                        : "candidates",
                  );
                }}
              />
            </>
          ) : (
            <>
              <StyledScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                <CandidateGroup
                  title="Presidential"
                  value={votePlan.presidential}
                  onChange={(value) =>
                    setVotePlan((current) => ({
                      ...current,
                      presidential: value,
                    }))
                  }
                />
                <CandidateGroup
                  title="House of Rep"
                  value={votePlan.houseOfRep}
                  onChange={(value) =>
                    setVotePlan((current) => ({
                      ...current,
                      houseOfRep: value,
                    }))
                  }
                />
              </StyledScrollView>

              <Button
                label="Submit"
                size="lg"
                className="mt-4 h-[60px] rounded-[22px]"
                onPress={() => {
                  onSubmit({
                    state: selectedState,
                    lga: selectedLga,
                    pollingUnit: selectedPollingUnit,
                    votes: votePlan,
                  });
                  modalRef.current?.dismiss();
                }}
              />
            </>
          )}
        </StyledView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function SelectionCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <StyledPressable
      onPress={onPress}
      className={cn(
        "mb-4 rounded-[18px] px-4 py-6",
        selected ? "bg-[#C9F1E4]" : "bg-[#F1EEF3]",
      )}
    >
      <StyledText className="text-xl leading-8 text-[#1D1B1C]">
        {label}
      </StyledText>
    </StyledPressable>
  );
}

function CandidateGroup({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StyledView className="mb-8">
      <StyledText className="mb-4 text-xl font-bold text-[#6D696D]">
        {title}
      </StyledText>
      {CANDIDATES.map((candidate) => {
        const selected = candidate.name === value;

        return (
          <StyledPressable
            key={`${title}-${candidate.name}`}
            onPress={() => onChange(candidate.name)}
            className={cn(
              "mb-4 flex-row items-center rounded-[18px] px-4 py-4",
              selected ? "bg-[#C9F1E4]" : "bg-[#F1EEF3]",
            )}
          >
            <StyledText className="flex-1 text-xl leading-8 text-[#1D1B1C]">
              {candidate.name}
            </StyledText>
            <Image
              source={candidate.image}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{ width: 54, height: 54, borderRadius: 999 }}
            />
          </StyledPressable>
        );
      })}
    </StyledView>
  );
}

function getStepConfig(step: FlowStep) {
  switch (step) {
    case "state":
      return { title: "Select a state" };
    case "lga":
      return { title: "Select an LGA" };
    case "pollingUnit":
      return { title: "Select a polling unit" };
    case "candidates":
      return { title: "Which of the candidates do you plan on voting for?" };
  }
}

function getFilteredItems({
  step,
  query,
  selectedState,
  selectedLga,
}: {
  step: FlowStep;
  query: string;
  selectedState: string;
  selectedLga: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const items =
    step === "state"
      ? STATES
      : step === "lga"
        ? (LGAS[selectedState as keyof typeof LGAS] ?? [])
        : (POLLING_UNITS[selectedLga as keyof typeof POLLING_UNITS] ?? []);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => item.toLowerCase().includes(normalizedQuery));
}

function isSelectedItem({
  step,
  item,
  selectedState,
  selectedLga,
  selectedPollingUnit,
}: {
  step: FlowStep;
  item: string;
  selectedState: string;
  selectedLga: string;
  selectedPollingUnit: string;
}) {
  if (step === "state") return item === selectedState;
  if (step === "lga") return item === selectedLga;
  return item === selectedPollingUnit;
}
