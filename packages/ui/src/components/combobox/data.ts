import type { ReactNode } from "react";

export type SelectOption = {
  value: string;
  label: string;
  searchText?: string;
  leading?: ReactNode;
};

export const COUNTRY_OPTIONS: SelectOption[] = [
  { value: "Nigeria", label: "Nigeria", searchText: "ng nigeria west africa" },
  { value: "Ghana", label: "Ghana", searchText: "gh ghana west africa" },
  { value: "Kenya", label: "Kenya", searchText: "ke kenya east africa" },
  { value: "South Africa", label: "South Africa", searchText: "za south africa" },
];

export const STATES_BY_COUNTRY: Record<string, SelectOption[]> = {
  Nigeria: [
    "Abia",
    "Abuja",
    "Anambra",
    "Delta",
    "Enugu",
    "Kaduna",
    "Kano",
    "Lagos",
    "Ogun",
    "Oyo",
    "Rivers",
  ].map((state) => ({ value: state, label: state })),
  Ghana: ["Accra", "Ashanti", "Central", "Eastern", "Northern", "Volta"].map((state) => ({
    value: state,
    label: state,
  })),
  Kenya: ["Mombasa", "Nairobi", "Nakuru", "Uasin Gishu"].map((state) => ({
    value: state,
    label: state,
  })),
  "South Africa": [
    "Eastern Cape",
    "Gauteng",
    "KwaZulu-Natal",
    "Limpopo",
    "Western Cape",
  ].map((state) => ({ value: state, label: state })),
};

export const GENDER_OPTIONS: SelectOption[] = ["Male", "Female"].map((gender) => ({
  value: gender,
  label: gender,
}));
