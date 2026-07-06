import type { ComponentType } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from "react-native";

import { cn } from "./cn";

const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;
const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;

const buttonVariantClassNames = {
  primary: "bg-brand",
  neutral: "bg-[#5C5C5C]",
  purple: "bg-[#7357F6]",
  secondary: "bg-[#00E287]",
  outline: "border border-line bg-white",
  outlineDanger: "border border-[#FF4242] bg-white",
} as const;

const buttonTextVariantClassNames = {
  primary: "text-white",
  neutral: "text-white",
  purple: "text-white",
  secondary: "text-[#194E39]",
  outline: "text-brand-deep",
  outlineDanger: "text-[#1D2A24]",
} as const;

const buttonLoadingIndicatorColors = {
  primary: "#FFFFFF",
  neutral: "#FFFFFF",
  purple: "#FFFFFF",
  secondary: "#194E39",
  outline: "#24654B",
  outlineDanger: "#F52828",
} as const;

const buttonSizeClassNames = {
  md: "h-14 rounded-[16px] px-4",
  lg: "h-16 rounded-[20px] px-5",
  xl: "h-[66px] rounded-[22px] px-6",
} as const;

type ButtonProps = PressableProps & {
  label?: string;
  children?: React.ReactNode;
  loading?: boolean;
  variant?: keyof typeof buttonVariantClassNames;
  size?: keyof typeof buttonSizeClassNames;
  fullWidth?: boolean;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  className?: string;
  textClassName?: string;
};

export function Button({
  label,
  children,
  loading,
  disabled,
  variant = "primary",
  size = "lg",
  fullWidth = true,
  leftAdornment,
  rightAdornment,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textContent = children ?? label;

  return (
    <StyledPressable
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center",
        fullWidth && "w-full",
        buttonSizeClassNames[size],
        buttonVariantClassNames[variant],
        isDisabled && "opacity-60",
        className,
      )}
      style={({ pressed }) => ({
        opacity: pressed && !isDisabled ? 0.92 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
      })}
      {...props}
    >
      <StyledView className="flex-row items-center justify-center gap-2">
        {loading ? (
          <ActivityIndicator
            color={buttonLoadingIndicatorColors[variant]}
            style={{ marginRight: 2 }}
          />
        ) : (
          leftAdornment
        )}
        {textContent ? (
          <StyledText
            className={cn(
              "text-xl font-bold leading-none",
              buttonTextVariantClassNames[variant],
              textClassName,
            )}
          >
            {textContent}
          </StyledText>
        ) : null}
        {!loading ? rightAdornment : null}
      </StyledView>
    </StyledPressable>
  );
}
