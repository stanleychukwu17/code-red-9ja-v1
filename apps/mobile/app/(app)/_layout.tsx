import { Stack } from "expo-router";

export default function InAppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="app-users" options={{ animation: "default" }} />
      <Stack.Screen name="candidates" options={{ animation: "default" }} />
      <Stack.Screen name="notifications" options={{ animation: "default" }} />
      <Stack.Screen name="user-profile" options={{ animation: "default" }} />
      <Stack.Screen name="post-detail" options={{ animation: "default" }} />
      <Stack.Screen name="states" options={{ animation: "default" }} />
      <Stack.Screen name="state-details" options={{ animation: "default" }} />
      <Stack.Screen
        name="polling-unit-details"
        options={{ animation: "default" }}
      />
      <Stack.Screen
        name="did-vote"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="voting-intent"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="post"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
