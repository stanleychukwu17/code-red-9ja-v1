import { configureStore } from "@reduxjs/toolkit";
import siteReducer, { sitePreferenceMiddleware } from "@/redux/slice/siteSlice";
import authReducer from "@/redux/slice/authSlice";
import countryReducer from "@/redux/slice/countrySlice";

export const store = configureStore({
  reducer: {
    site: siteReducer,
    auth: authReducer,
    country: countryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sitePreferenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;