import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type KeyboardAvoidingViewProps,
  type PressableProps,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import {
  OnboardingMailIcon,
  OnboardingMapPinIcon,
  OnboardingNinIcon,
  OnboardingOtpIcon,
  OnboardingPasswordIcon,
  OnboardingUserIcon,
} from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";

type OnboardingIconName =
  | "mail"
  | "map-pin"
  | "nin"
  | "otp"
  | "password"
  | "user";

type FooterAction = {
  label: string;
  onPress?: () => void;
};

type FooterLink = {
  label: string;
  onPress?: () => void;
  accent?: boolean;
};

type FlowScreenProps = {
  title: string;
  subtitle?: ReactNode;
  icon: OnboardingIconName;
  onBackPress?: () => void;
  primaryAction?: FooterAction;
  secondaryAction?: FooterAction;
  footerLinks?: FooterLink[];
  children: ReactNode;
};

type FlowFieldProps = ComponentProps<typeof TextField> & {
  label?: string;
  helper?: string;
};

export function FlowField({
  label,
  helper,
  className,
  ...props
}: FlowFieldProps) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-xl font-semibold text-brand-deep">{label}</Text>
      ) : null}
      <TextField className={cn("text-xl", className)} {...props} />
      {helper ? (
        <Text className="text-base leading-6 text-muted">{helper}</Text>
      ) : null}
    </View>
  );
}

export function FlowSelectField({
  value,
  placeholder,
  onPress,
}: {
  value?: string;
  placeholder: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        setTimeout(() => {
          onPress?.();
        }, 120);
      }}
      className="h-16 flex-row items-center justify-between rounded-2xl border-2 border-transparent bg-surface-muted px-4"
    >
      <Text
        className={cn(
          "text-xl font-medium",
          value ? "text-brand-deep" : "text-brand-deep",
        )}
      >
        {value && value.trim().length > 0 ? value : placeholder}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={18} color="#A7A1A3" />
    </Pressable>
  );
}

export function FlowOtpInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="gap-3">
      <TextField
        value={value}
        onChangeText={(nextValue) =>
          onChangeText(nextValue.replace(/[^0-9]/g, "").slice(0, 6))
        }
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        placeholder="------"
        className="border-brand px-4 font-medium text-black/80 tracking-[20px]"
      />
    </View>
  );
}

export function FlowBottomSheet({
  visible,
  onClose,
  options,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <NativeBottomSheet visible={visible} onClose={onClose}>
      <View className="rounded-t-[20px] bg-white px-5 py-3 pb-10">
        <View className="mb-2 self-center h-1 w-10 rounded-full bg-white" />
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              onSelect(option);
              onClose();
            }}
            className="py-4"
          >
            <Text className="text-xl text-brand-deep">{option}</Text>
          </Pressable>
        ))}
      </View>
    </NativeBottomSheet>
  );
}

export function FlowPickerSheet({
  visible,
  onClose,
  selectedValue,
  title,
  options,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selectedValue?: string;
  title?: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <NativeBottomSheet visible={visible} onClose={onClose}>
      <View className="rounded-t-[28px] bg-white py-3 pb-20">
        <View className="pb-3">
          {options.map((option) => {
            const isSelected = option === selectedValue;

            return (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                className="flex-row items-center justify-between px-8 h-16"
              >
                <Text
                  className={cn(
                    "text-xl text-black/80",
                    isSelected && "font-semibold",
                  )}
                >
                  {option}
                </Text>
                {isSelected ? (
                  <MaterialIcons name="check" size={22} color="#2F7351" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </NativeBottomSheet>
  );
}

function NativeBottomSheet({
  visible,
  onClose,
  snapPoints,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  snapPoints?: string[];
  children: ReactNode;
}) {
  const modalRef = useRef<BottomSheetModal>(null);
  const points = useMemo(() => snapPoints ?? ["48%"], [snapPoints]);

  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={points}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.1}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#E6E0E2",
        width: 40,
        height: 4,
      }}
    >
      <BottomSheetView>{children}</BottomSheetView>
    </BottomSheetModal>
  );
}

export function NativeDateField({
  value,
  placeholder,
  onChange,
}: {
  value?: Date | null;
  placeholder: string;
  onChange: (value: Date) => void;
}) {
  const [showDateSheet, setShowDateSheet] = useState(false);

  const openPicker = () => {
    setShowDateSheet(true);
  };

  return (
    <>
      <FlowSelectField
        value={
          value
            ? value.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined
        }
        placeholder={placeholder}
        onPress={openPicker}
      />

      <NativeBottomSheet
        visible={showDateSheet}
        onClose={() => setShowDateSheet(false)}
      >
        <View className="rounded-t-[28px] bg-white pt-3">
          <View className="items-center px-3 pb-5">
            <DateTimePicker
              value={value ?? new Date(2000, 6, 20)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "spinner"}
              maximumDate={new Date()}
              style={{
                width: "100%",
                maxWidth: Platform.OS === "ios" ? 390 : undefined,
                alignSelf: "center",
              }}
              onChange={(event, selectedDate) => {
                if (event.type === "set" && selectedDate) {
                  onChange(selectedDate);
                }
              }}
            />
          </View>
        </View>
      </NativeBottomSheet>
    </>
  );
}

export function FlowScreen({
  title,
  subtitle,
  icon,
  onBackPress,
  primaryAction,
  secondaryAction,
  footerLinks,
  children,
}: FlowScreenProps) {
  const IconComponent = {
    mail: OnboardingMailIcon,
    "map-pin": OnboardingMapPinIcon,
    nin: OnboardingNinIcon,
    otp: OnboardingOtpIcon,
    password: OnboardingPasswordIcon,
    user: OnboardingUserIcon,
  }[icon];

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="min-h-full px-[18px] pb-8 pt-4">
            <Pressable
              className="mb-6 h-12 w-12 items-start justify-center"
              onPress={onBackPress}
            >
              <MaterialIcons
                name="arrow-back-ios-new"
                size={18}
                color="#464043"
              />
            </Pressable>

            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#F3EDEF]">
              <IconComponent />
            </View>

            <View className="mb-7">
              <Text className="mb-1 text-[24px] font-bold leading-8 tracking-snugger text-brand-deep">
                {title}
              </Text>
              {subtitle ? (
                typeof subtitle === "string" ? (
                  <Text className="text-lg leading-6 text-muted">
                    {subtitle}
                  </Text>
                ) : (
                  subtitle
                )
              ) : null}
            </View>

            <View className="gap-4">{children}</View>

            <View className="mt-auto pt-10">
              {primaryAction ? (
                <Button
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  className="shadow-soft"
                />
              ) : null}

              {secondaryAction ? (
                <Button
                  label={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  className="mt-3 border border-line bg-white"
                  textClassName="text-brand-deep"
                />
              ) : null}

              {!!footerLinks?.length && (
                <View
                  className={cn(
                    "mt-6 flex-row items-center justify-between",
                    footerLinks.length === 1 && "justify-start",
                  )}
                >
                  {footerLinks.map((link) => (
                    <Pressable
                      key={link.label}
                      onPress={link.onPress}
                      hitSlop={8}
                    >
                      <Text
                        className={cn(
                          "text-[13px] font-medium leading-[18px] text-[#6C9B85]",
                          link.accent && "font-bold text-brand",
                        )}
                      >
                        {link.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
