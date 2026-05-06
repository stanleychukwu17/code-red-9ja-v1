import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface SiteState {
  title: string;
  openSidebar: boolean;
}

const initialState: SiteState = {
  title: "Free9ja",
  openSidebar: false,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    setSiteTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
    },
    setOpenSidebar: (state, action: PayloadAction<boolean>) => {
      state.openSidebar = action.payload;
    },
  },
});

export const { setSiteTitle, setOpenSidebar } = siteSlice.actions;

export default siteSlice.reducer;
