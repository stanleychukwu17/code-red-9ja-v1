import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
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
  View,
  type PressableProps,
  type ScrollViewProps,
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

type UploadStep = "guide" | "upload";
type UploadSource = "camera" | "gallery" | null;

type UploadVoteResultSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (payload: { source: Exclude<UploadSource, null> }) => void;
};

const SAMPLE_RESULT_IMAGE =
  "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&h=900&fit=crop";

export function UploadVoteResultSheet({
  visible,
  onClose,
  onSubmit,
}: UploadVoteResultSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const [step, setStep] = useState<UploadStep>("guide");
  const [uploadSource, setUploadSource] = useState<UploadSource>(null);

  useEffect(() => {
    if (visible) {
      setStep("guide");
      setUploadSource(null);
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  const handleDismiss = () => {
    setStep("guide");
    setUploadSource(null);
    onClose();
  };

  const handleBackPress = () => {
    if (step === "guide") {
      modalRef.current?.dismiss();
      return;
    }

    setStep("guide");
  };

  const handleSourcePress = (source: Exclude<UploadSource, null>) => {
    setUploadSource(source);
  };

  const footerLabel = step === "guide" ? "I understand" : "Upload";
  const footerDisabled = step === "upload" && !uploadSource;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
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
        backgroundColor: "#FFFBFD",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#E7E1E4",
        width: 40,
        height: 4,
      }}
      footerComponent={(props) => (
        <BottomSheetFooter {...props}>
          <StyledView className="bg-[#FFFBFD] px-5 pb-6 pt-4">
            <Button
              label={footerLabel}
              variant={step === "guide" ? "neutral" : "primary"}
              size="lg"
              disabled={footerDisabled}
              className={cn(
                "h-[60px] rounded-[22px]",
                step === "guide"
                  ? "bg-black"
                  : footerDisabled
                    ? "bg-[#C8D8D0]"
                    : "bg-brand",
              )}
              textClassName={step === "upload" ? "text-white font-semibold" : undefined}
              onPress={() => {
                if (step === "guide") {
                  setStep("upload");
                  return;
                }

                if (!uploadSource) {
                  return;
                }

                onSubmit?.({ source: uploadSource });
                modalRef.current?.dismiss();
              }}
            />
          </StyledView>
        </BottomSheetFooter>
      )}
    >
      <BottomSheetView style={{ flex: 1, minHeight: 0 }}>
        <StyledView
          className="flex-1 bg-[#FFFBFD] px-5 pb-6 pt-4"
          style={{ minHeight: 0 }}
        >
          <SheetHeader
            onBackPress={handleBackPress}
            onClosePress={() => modalRef.current?.dismiss()}
          />

          {step === "guide" ? (
            <>
              <StyledText className="mb-10 text-[24px] font-bold leading-[42px] text-brand-deep">
                Ensure you upload a picture that is very very very clear.
              </StyledText>

              <StyledScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
              >
                <StyledText className="mb-2 text-[18px] leading-10 text-[#353133]">
                  1. Snap entire election result form.
                </StyledText>
                <StyledText className="mb-12 text-[18px] leading-10 text-[#353133]">
                  2. Make sure all candidates & their votes are shown clearly in
                  your upload.
                </StyledText>

                <StyledText className="mb-4 text-[18px] font-bold text-[#353133]">
                  Good Example Below:
                </StyledText>

                <Image
                  source={SAMPLE_RESULT_IMAGE}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  style={{ width: "100%", height: 470, borderRadius: 12 }}
                />
              </StyledScrollView>

            </>
          ) : (
            <>
              <MaterialIcons
                name="how-to-vote"
                size={34}
                color="#2A7B57"
                style={{ marginBottom: 12 }}
              />

              <StyledText className="mb-4 text-[24px] font-bold leading-[42px] text-brand-deep">
                Upload a picture of the voting result.
              </StyledText>

              <StyledText className="mb-8 text-[16px] leading-8 text-[#8D878C]">
                This ensures that your polling unit&apos;s result count.
              </StyledText>

              <StyledScrollView
                className="flex-1"
                style={{ minHeight: 0 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
              >
                <ActionCard
                  label="Take a Picture"
                  icon="photo-camera"
                  onPress={() => handleSourcePress("camera")}
                />
                <ActionCard
                  label="Select from Gallery"
                  icon="image"
                  className="mb-6"
                  onPress={() => handleSourcePress("gallery")}
                />

                <StyledView
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-dashed px-4 py-4",
                    uploadSource
                      ? "border-transparent bg-[#E8E2E4]"
                      : "min-h-[236px] items-center justify-center border-[#D4CFD2] bg-transparent",
                  )}
                >
                  {uploadSource ? (
                    <Image
                      source={SAMPLE_RESULT_IMAGE}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      style={{ width: "100%", height: 250, borderRadius: 12 }}
                    />
                  ) : (
                    <StyledText className="text-center text-[18px] font-bold text-[#8A8588]">
                      No result uploaded yet
                    </StyledText>
                  )}
                </StyledView>
              </StyledScrollView>
            </>
          )}
        </StyledView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function SheetHeader({
  onBackPress,
  onClosePress,
}: {
  onBackPress: () => void;
  onClosePress: () => void;
}) {
  return (
    <StyledView className="mb-7 flex-row items-center justify-between">
      <StyledPressable hitSlop={8} onPress={onBackPress}>
        <MaterialIcons name="arrow-back-ios-new" size={20} color="#7B7679" />
      </StyledPressable>
      <StyledPressable hitSlop={8} onPress={onClosePress}>
        <StyledText className="text-[16px] text-brand">Close</StyledText>
      </StyledPressable>
    </StyledView>
  );
}

function ActionCard({
  label,
  icon,
  className,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  className?: string;
  onPress: () => void;
}) {
  return (
    <StyledPressable
      className={cn(
        "mb-4 flex-row items-center justify-between rounded-[22px] bg-[#ECE7EA] px-5 py-6",
        className,
      )}
      onPress={onPress}
    >
      <StyledText className="text-[18px] text-[#1D1B1C]">{label}</StyledText>
      <MaterialIcons name={icon} size={30} color="#777174" />
    </StyledPressable>
  );
}
