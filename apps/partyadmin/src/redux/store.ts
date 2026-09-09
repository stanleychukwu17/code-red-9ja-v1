/**
 * @file Redux Store Configuration
 * @description Configures the central Redux Toolkit store for the partyadmin application.
 * Integrates site, auth, and election reducers alongside the custom sitePreferenceMiddleware
 * for automated user preference synchronization.
 */

import { configureStore } from "@reduxjs/toolkit";
import siteReducer, { sitePreferenceMiddleware } from "@/redux/slice/siteSlice";
import authReducer from "@/redux/slice/authSlice";
import electionReducer from "@/redux/slice/electionSlice";

export const store = configureStore({
  reducer: {
    site: siteReducer,
    auth: authReducer,
    election: electionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sitePreferenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
