import { useRouter } from "expo-router";
import { useState } from "react";

import { FlowField, FlowScreen } from "@/components/onboarding/flow-screen";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");

  return (
    <FlowScreen
      title="Forgot password"
      subtitle="Provide your email or phone number."
      icon="mail"
      onBackPress={() => router.back()}
      primaryAction={{
        label: "Continue",
        onPress: () => router.push("/forgot-password-otp"),
      }}
    >
      <FlowField
        placeholder="Email or phone number"
        value={identifier}
        onChangeText={setIdentifier}
        autoFocus
      />
    </FlowScreen>
  );
}
