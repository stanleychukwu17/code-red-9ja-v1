import { Tabs } from "expo-router";

export default function InAppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        animation: "none",
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
