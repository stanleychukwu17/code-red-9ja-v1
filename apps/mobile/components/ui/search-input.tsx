import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentType } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";

import { cn } from "./cn";

const StyledTextInput = TextInput as unknown as ComponentType<
  TextInputProps & { className?: string }
>;
const StyledView = View as unknown as ComponentType<ViewProps & { className?: string }>;

type SearchInputProps = TextInputProps & {
  containerClassName?: string;
  inputClassName?: string;
};

export function SearchInput({
  containerClassName,
  inputClassName,
  placeholder = "Search...",
  placeholderTextColor = "#777275",
  ...props
}: SearchInputProps) {
  return (
    <StyledView
      className={cn(
        "h-[60px] flex-row items-center rounded-full bg-[#E8E8EA] px-5",
        containerClassName,
      )}
    >
      <MaterialIcons name="search" size={24} color="#7D797C" />
      <StyledTextInput
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        selectionColor="#2F7B57"
        className={cn(
          "ml-4 flex-1 py-0 text-[18px] leading-[22px] text-[#2A2628]",
          inputClassName,
        )}
        {...props}
      />
    </StyledView>
  );
}
