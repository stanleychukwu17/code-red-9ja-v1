import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { FlowOtpInput, FlowScreen } from "@/components/onboarding/flow-screen";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ flow?: string }>();
  const [otp, setOtp] = useState("");

  const isSignupFlow = params.flow === "signup";

  return (
    <FlowScreen
      title="Enter OTP"
      subtitle={
        <Text className="text-lg leading-6 text-muted">
          We sent you an OTP to{" "}
          <Text className="text-lg font-bold text-[#7B7678]">stanley@gmail.com.</Text>
        </Text>
      }
      icon="dialpad"
      onBackPress={() => router.back()}
      primaryAction={{
        label: "Continue",
        onPress: () =>
          router.push(isSignupFlow ? "/user-details" : "/dashboard"),
      }}
    >
      <FlowOtpInput value={otp} onChangeText={setOtp} />
    </FlowScreen>
  );
}
