import { configureStore } from "@reduxjs/toolkit";
import siteReducer from "@/redux/slice/siteSlice";

// const isBrowser = typeof window !== "undefined";
// const savedSiteState = isBrowser ? localStorage.getItem("site") : null;
// const preloadedSiteState = savedSiteState ? JSON.parse(savedSiteState) : undefined;

export const store = configureStore({
  reducer: {
    site: siteReducer,
  },
});


// every time the site state changes, save it to localStorage,
// the site carries the user's theme preference
let timeout: ReturnType<typeof setTimeout>;
store.subscribe(() => {
  clearTimeout(timeout);

  timeout = setTimeout(() => {
    localStorage.setItem("site", JSON.stringify(store.getState().site));
  }, 200);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;