import { useRouter } from "expo-router";
import { useState } from "react";

import { FlowField, FlowScreen } from "@/components/onboarding/flow-screen";

export default function NinVerificationScreen() {
  const router = useRouter();
  const [nin, setNin] = useState("");

  return (
      <FlowScreen
        title="Add your NIN"
        subtitle="Enter your National Identification Number."
        icon="nin"
        onBackPress={() => router.back()}
        primaryAction={{ label: "Continue", onPress: () => router.push("/location") }}
      >
      <FlowField
        placeholder="NIN"
        value={nin}
        onChangeText={(value) => setNin(value.replace(/[^0-9]/g, "").slice(0, 11))}
        keyboardType="number-pad"
        autoFocus
      />
    </FlowScreen>
  );
}
