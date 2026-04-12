import { Link } from "expo-router";
import { type ComponentType, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
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
import { LogoIcon } from "../ui/icons";

const StyledSafeAreaView = SafeAreaView as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledKeyboardAvoidingView =
  KeyboardAvoidingView as unknown as ComponentType<
    KeyboardAvoidingViewProps & { className?: string }
  >;
const StyledScrollView = ScrollView as unknown as ComponentType<
  ScrollViewProps & { className?: string; contentContainerClassName?: string }
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

type FieldProps = {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
};

type PrimaryActionProps = {
  label: string;
  onPress?: () => void;
};

type FooterLinkProps = {
  label: string;
  href: "/login" | "/signup";
  accent?: boolean;
};

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryAction: PrimaryActionProps;
  footerLinks?: FooterLinkProps[];
};

export function AuthField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
}: FieldProps) {
  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
    />
  );
}

export function PrimaryButton({ label, onPress }: PrimaryActionProps) {
  return (
    <Button label={label} onPress={onPress} className="mt-4 shadow-soft" />
  );
}

export function AuthScreen({
  title,
  subtitle,
  children,
  primaryAction,
  footerLinks,
}: AuthScreenProps) {
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
        >
          <StyledView className="min-h-full px-[15px] pb-8 pt-10">
            <StyledView className="mb-7 mt-2">
              <StyledView className="mb-7">
                <LogoIcon />
              </StyledView>
              <StyledText className="mb-1.5 text-[22px] font-bold leading-7 tracking-snugger text-brand-deep">
                {title}
              </StyledText>
              <StyledText className="text-sm leading-5 text-muted">
                {subtitle}
              </StyledText>
            </StyledView>

            <StyledView className="gap-3.5">{children}</StyledView>

            <PrimaryButton {...primaryAction} />

            {!!footerLinks?.length && (
              <StyledView
                className={cn(
                  "mt-[22px] flex-row items-center justify-between",
                  footerLinks.length === 1 && "justify-start",
                )}
              >
                {footerLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    asChild
                  >
                    <StyledPressable hitSlop={8}>
                      <StyledText
                        className={cn(
                          "text-[13px] font-medium leading-[18px] text-[#6C9B85]",
                          link.accent && "font-bold text-brand",
                        )}
                      >
                        {link.label}
                      </StyledText>
                    </StyledPressable>
                  </Link>
                ))}
              </StyledView>
            )}
          </StyledView>
        </StyledScrollView>
      </StyledKeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
