import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import { TextField } from "@/components/ui/text-field";
const StyledSafeAreaView = SafeAreaView as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledKeyboardAvoidingView =
  KeyboardAvoidingView as unknown as ComponentType<
    KeyboardAvoidingViewProps & { className?: string }
  >;
const StyledScrollView = ScrollView as unknown as ComponentType<
  ScrollViewProps & { className?: string }
>;
const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;
const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;

type OnboardingIconName = ComponentProps<typeof MaterialIcons>["name"];

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

type FlowFieldProps = React.ComponentProps<typeof TextField> & {
  label?: string;
  helper?: string;
};

export function FlowField({ label, helper, className, ...props }: FlowFieldProps) {
  return (
    <StyledView className="gap-2">
      {label ? (
        <StyledText className="text-xl font-semibold text-brand-deep">{label}</StyledText>
      ) : null}
      <TextField className={cn("text-xl", className)} {...props} />
      {helper ? (
        <StyledText className="text-base leading-6 text-muted">{helper}</StyledText>
      ) : null}
    </StyledView>
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
    <StyledPressable
      onPress={onPress}
      className="h-16 flex-row items-center justify-between rounded-2xl border-2 border-transparent bg-surface-muted px-4"
    >
      <StyledText className={cn("text-xl font-medium", value ? "text-brand-deep" : "text-brand-deep")}>
        {value && value.trim().length > 0 ? value : placeholder}
      </StyledText>
      <MaterialIcons name="keyboard-arrow-down" size={18} color="#A7A1A3" />
    </StyledPressable>
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
    <StyledView className="gap-3">
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
    </StyledView>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StyledPressable className="flex-1 bg-black/10" onPress={onClose}>
        <StyledView className="mt-auto rounded-t-[20px] bg-white px-5 py-3">
          <StyledView className="mb-2 self-center h-1 w-10 rounded-full bg-white" />
          {options.map((option) => (
            <StyledPressable
              key={option}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
              className="py-4"
            >
              <StyledText className="text-xl text-brand-deep">{option}</StyledText>
            </StyledPressable>
          ))}
        </StyledView>
      </StyledPressable>
    </Modal>
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
      <StyledView className="rounded-t-[28px] bg-white px-4 py-3">
        <StyledView className="mb-2 self-center h-1 w-10 rounded-full bg-[#E6E0E2]" />
        <StyledView className="mb-3 flex-row items-center justify-between px-2">
          <StyledText className="text-lg font-semibold text-brand-deep">
            {title ?? "Select"}
          </StyledText>
          <StyledPressable onPress={onClose}>
            <StyledText className="text-lg font-semibold text-brand">Done</StyledText>
          </StyledPressable>
        </StyledView>
        <StyledView className="pb-3">
          {options.map((option) => {
            const isSelected = option === selectedValue;

            return (
              <StyledPressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                className="flex-row items-center justify-between px-2 py-4"
              >
                <StyledText
                  className={cn(
                    "text-xl text-brand-deep",
                    isSelected && "font-semibold text-brand",
                  )}
                >
                  {option}
                </StyledText>
                {isSelected ? (
                  <MaterialIcons name="check" size={22} color="#2F7351" />
                ) : null}
              </StyledPressable>
            );
          })}
        </StyledView>
      </StyledView>
    </NativeBottomSheet>
  );
}

function NativeBottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(visible);
  const translateY = useState(() => new Animated.Value(420))[0];

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.setValue(420);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        mass: 0.9,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [translateY, visible]);

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        onClose();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        },
      }),
    [translateY],
  );

  if (!isMounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeSheet}>
      <StyledView className="flex-1 justify-end bg-black/10">
        <Pressable style={{ flex: 1 }} onPress={closeSheet} />
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateY }],
          }}
        >
          {children}
        </Animated.View>
      </StyledView>
    </Modal>
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

      <NativeBottomSheet visible={showDateSheet} onClose={() => setShowDateSheet(false)}>
        <StyledView className="rounded-t-[28px] bg-white px-4 py-3">
          <StyledView className="mb-2 self-center h-1 w-10 rounded-full bg-[#E6E0E2]" />
          <StyledView className="mb-3 flex-row items-center justify-between px-2">
            <StyledText className="text-lg font-semibold text-brand-deep">
              Select date of birth
            </StyledText>
            <StyledPressable onPress={() => setShowDateSheet(false)}>
              <StyledText className="text-lg font-semibold text-brand">Done</StyledText>
            </StyledPressable>
          </StyledView>
          <DateTimePicker
            value={value ?? new Date(2000, 6, 20)}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "spinner"}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                onChange(selectedDate);
              }
            }}
          />
        </StyledView>
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
  return (
    <StyledSafeAreaView className="flex-1 bg-surface">
      <StyledKeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StyledScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <StyledView className="min-h-full px-[18px] pb-8 pt-4">
            <StyledPressable className="mb-6 h-10 w-10 items-start justify-center" onPress={onBackPress}>
              <MaterialIcons name="arrow-back-ios-new" size={18} color="#464043" />
            </StyledPressable>

            <StyledView className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#F3EDEF]">
              <MaterialIcons name={icon} size={24} color="#8D888A" />
            </StyledView>

            <StyledView className="mb-7">
              <StyledText className="mb-1 text-[24px] font-bold leading-8 tracking-snugger text-brand-deep">
                {title}
              </StyledText>
              {subtitle ? (
                typeof subtitle === "string" ? (
                  <StyledText className="text-lg leading-6 text-muted">{subtitle}</StyledText>
                ) : (
                  subtitle
                )
              ) : null}
            </StyledView>

            <StyledView className="gap-4">{children}</StyledView>

            <StyledView className="mt-auto pt-10">
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
                <StyledView
                  className={cn(
                    "mt-6 flex-row items-center justify-between",
                    footerLinks.length === 1 && "justify-start",
                  )}
                >
                  {footerLinks.map((link) => (
                    <StyledPressable key={link.label} onPress={link.onPress} hitSlop={8}>
                      <StyledText
                        className={cn(
                          "text-[13px] font-medium leading-[18px] text-[#6C9B85]",
                          link.accent && "font-bold text-brand",
                        )}
                      >
                        {link.label}
                      </StyledText>
                    </StyledPressable>
                  ))}
                </StyledView>
              )}
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </StyledKeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
