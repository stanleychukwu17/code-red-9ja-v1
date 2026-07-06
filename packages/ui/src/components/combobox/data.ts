import type { ReactNode } from "react";

export type SelectOption = {
  value: string;
  label: string;
  searchText?: string;
  leading?: ReactNode;
};

export const GENDER_OPTIONS: SelectOption[] = ["Male", "Female"].map((gender) => ({value: gender, label: gender}));
