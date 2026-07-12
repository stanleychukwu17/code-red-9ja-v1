import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Country {
  id: number;
  name: string;
  iso2: string;
  phonecode: string;
}

export interface CountryState {
  // countries: The list of countries fetched from the backend
  countries?: Country[];
}

const initialState: CountryState = {
  countries: undefined,
};

export const countrySlice = createSlice({
  name: "country",
  initialState,
  reducers: {
    updateCountryState: (state, action: PayloadAction<Partial<CountryState>>) => {
      const { countries } = action.payload;
      if (countries !== undefined) state.countries = countries;

      return state;
    },
  },
});

export const { updateCountryState } = countrySlice.actions;

export default countrySlice.reducer;
