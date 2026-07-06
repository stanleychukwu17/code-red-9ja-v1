import { useRouter } from "expo-router";
import { useState } from "react";

import { FlowField, FlowScreen } from "@/components/onboarding/flow-screen";

export default function SetNewPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <FlowScreen
      title="Set new password"
      subtitle="Enter your new password."
      icon="password"
      onBackPress={() => router.back()}
      primaryAction={{
        label: "Continue",
        onPress: () => router.replace("/login"),
      }}
    >
      <FlowField
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoFocus
      />
      <FlowField
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
    </FlowScreen>
  );
}
