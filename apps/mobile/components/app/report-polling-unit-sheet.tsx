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

type ReportStep = "category" | "details" | "evidence";

type ReportPollingUnitSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (payload: {
    category: string;
    details: string;
    evidenceCount: number;
  }) => void;
};

const REPORT_CATEGORIES = [
  "Ballot box stuffing",
  "Result falsification",
  "Vote buying or selling",
  "Multiple voting",
  "Impersonation of voters",
];

const MOCK_EVIDENCE_PREVIEW =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=900&h=600&fit=crop";

export function ReportPollingUnitSheet({
  visible,
  onClose,
  onSubmit,
}: ReportPollingUnitSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const [step, setStep] = useState<ReportStep>("category");
  const [selectedCategory, setSelectedCategory] = useState(
    "Ballot box stuffing",
  );
  const [details, setDetails] = useState("");
  const [evidenceCount, setEvidenceCount] = useState(0);

  useEffect(() => {
    if (visible) {
      setStep("category");
      setSelectedCategory("Ballot box stuffing");
      setDetails("");
      setEvidenceCount(0);
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

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
              onPress={() => {
                if (step === "category") {
                  modalRef.current?.dismiss();
                  return;
                }
                setStep(
                  step === "details"
                    ? "category"
                    : "details",
                );
              }}
            >
              <MaterialIcons
                name="arrow-back-ios-new"
                size={20}
                color="#676266"
              />
            </StyledPressable>
            <StyledPressable hitSlop={8} onPress={() => modalRef.current?.dismiss()}>
              <StyledText className="text-[16px] text-brand">Close</StyledText>
            </StyledPressable>
          </StyledView>

          <MaterialIcons
            name="campaign"
            size={30}
            color="#F52828"
            style={{ marginBottom: 16 }}
          />

          {step === "category" ? (
            <>
              <StyledText className="mb-7 text-[24px] font-bold leading-9 text-brand-deep">
                What are you reporting?
              </StyledText>
              <StyledText className="mb-5 text-[16px] font-bold text-[#6D696D]">
                Manipulation & Fraud
              </StyledText>

              <StyledScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {REPORT_CATEGORIES.map((item) => (
                  <SelectionCard
                    key={item}
                    label={item}
                    selected={item === selectedCategory}
                    onPress={() => setSelectedCategory(item)}
                  />
                ))}
              </StyledScrollView>

              <Button
                label="Continue"
                size="lg"
                className="mt-4 h-[60px] rounded-[22px]"
                onPress={() => setStep("details")}
              />
            </>
          ) : step === "details" ? (
            <>
              <StyledText className="mb-3 text-[24px] font-bold leading-9 text-brand-deep">
                Please tell us why you are reporting this polling unit?
              </StyledText>
              <StyledText className="mb-6 text-[16px] text-muted">
                Please narrate what happened.
              </StyledText>

              <StyledTextInput
                value={details}
                onChangeText={setDetails}
                multiline
                textAlignVertical="top"
                placeholder="Tell us more..."
                placeholderTextColor="#9D989C"
                className="h-40 rounded-[18px] border-2 border-brand bg-[#EBE8EC] px-4 py-4 text-xl text-[#1D1B1C]"
              />

              <StyledView className="mt-8 rounded-[14px] bg-[#FBE8B9] px-4 py-4">
                <StyledText className="text-[14px] leading-6 text-[#201E1F]">
                  Ensure your vote counts. Tell us exactly what and what
                  happened here.
                </StyledText>
              </StyledView>

              <StyledView className="mt-auto pt-6">
                <Button
                  label="Continue"
                  size="lg"
                  className="h-[60px] rounded-[22px]"
                  onPress={() => setStep("evidence")}
                />
              </StyledView>
            </>
          ) : (
            <>
              <StyledView className="mb-6 flex-row items-start justify-between">
                <StyledView className="flex-1 pr-4">
                  <StyledText className="text-[24px] font-bold leading-9 text-brand-deep">
                    Upload image or video evidences
                  </StyledText>
                  <StyledText className="mt-3 text-[16px] text-muted">
                    This makes your report more believable.
                  </StyledText>
                </StyledView>
                {evidenceCount > 0 ? (
                  <StyledText className="text-[44px] font-bold text-[#4B4749]">
                    {evidenceCount}
                  </StyledText>
                ) : null}
              </StyledView>

              <StyledPressable
                className="mb-4 flex-row items-center justify-between rounded-[18px] bg-[#EBE8EC] px-4 py-6"
                onPress={() => setEvidenceCount((count) => Math.max(1, count + 1))}
              >
                <StyledText className="text-xl text-[#1D1B1C]">Camera</StyledText>
                <MaterialIcons name="photo-camera" size={28} color="#7C777B" />
              </StyledPressable>

              <StyledPressable
                className="mb-6 flex-row items-center justify-between rounded-[18px] bg-[#EBE8EC] px-4 py-6"
                onPress={() => setEvidenceCount((count) => Math.max(1, count + 1))}
              >
                <StyledText className="text-xl text-[#1D1B1C]">Gallery</StyledText>
                <MaterialIcons name="image" size={28} color="#4C494B" />
              </StyledPressable>

              {evidenceCount > 0 ? (
                <StyledView className="mb-6 overflow-hidden rounded-[18px]">
                  <Image
                    source={MOCK_EVIDENCE_PREVIEW}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    style={{ width: "100%", height: 228 }}
                  />
                  <StyledPressable
                    className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                    onPress={() => setEvidenceCount(0)}
                  >
                    <MaterialIcons name="close" size={18} color="#FFFFFF" />
                  </StyledPressable>
                  <StyledView className="absolute inset-0 items-center justify-center">
                    <StyledView className="h-16 w-16 items-center justify-center rounded-full bg-black/35">
                      <MaterialIcons name="play-arrow" size={34} color="#FFFFFF" />
                    </StyledView>
                  </StyledView>
                </StyledView>
              ) : null}

              <StyledView className="mt-auto pt-6">
                <Button
                  label="Submit"
                  size="lg"
                  className="h-[60px] rounded-[22px]"
                  onPress={() => {
                    onSubmit?.({
                      category: selectedCategory,
                      details,
                      evidenceCount,
                    });
                    modalRef.current?.dismiss();
                  }}
                />
              </StyledView>
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
