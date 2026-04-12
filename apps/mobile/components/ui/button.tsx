import type { ComponentType } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type TextProps,
} from "react-native";

import { cn } from "./cn";

const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  className?: string;
  textClassName?: string;
};

export function Button({
  label,
  loading,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <StyledPressable
      disabled={isDisabled}
      className={cn(
        "h-16 w-full flex-row items-center justify-center rounded-full bg-brand px-4",
        isDisabled && "opacity-60",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
      ) : null}
      <StyledText
        className={cn("text-base font-bold text-white", textClassName)}
      >
        {label}
      </StyledText>
    </StyledPressable>
  );
}
