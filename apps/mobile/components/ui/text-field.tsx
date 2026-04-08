import { useState, type ComponentType } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { cn } from "./cn";

const StyledTextInput = TextInput as unknown as ComponentType<
  TextInputProps & { className?: string }
>;

type TextFieldProps = TextInputProps & {
  active?: boolean;
  className?: string;
};

export function TextField({ active, className, ...props }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = active || isFocused;

  return (
    <StyledTextInput
      className={cn(
        "h-16 rounded-2xl border-2 px-4 text-xl font-medium leading-6 text-brand-deep",
        isActive
          ? "border-brand bg-surface-muted"
          : "border-transparent bg-surface-muted",
        className,
      )}
      placeholderTextColor="#BDB5B8"
      selectionColor="#2F7B57"
      onFocus={(event) => {
        setIsFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        props.onBlur?.(event);
      }}
      {...props}
    />
  );
}
