import { configureStore } from "@reduxjs/toolkit";
import siteReducer from "@/redux/slice/siteSlice";
import authReducer from "@/redux/slice/authSlice";

export const store = configureStore({
  reducer: {
    site: siteReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;