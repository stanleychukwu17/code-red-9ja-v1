import { configureStore } from "@reduxjs/toolkit";
import siteReducer from "@/redux/slice/siteSlice";

export const store = configureStore({
  reducer: {
    site: siteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;