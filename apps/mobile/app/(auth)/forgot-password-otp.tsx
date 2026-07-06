import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { FlowOtpInput, FlowScreen } from "@/components/onboarding/flow-screen";

export default function ForgotPasswordOtpScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState("");

  return (
    <FlowScreen
      title="Enter OTP"
      subtitle={
        <Text className="text-lg leading-6 text-muted">
          We sent you an OTP to{" "}
          <Text className="text-lg font-bold text-[#7B7678]">stanley@gmail.com.</Text>
        </Text>
      }
      icon="otp"
      onBackPress={() => router.back()}
      primaryAction={{
        label: "Continue",
        onPress: () => router.push("/set-new-password"),
      }}
    >
      <FlowOtpInput value={otp} onChangeText={setOtp} />
    </FlowScreen>
  );
}
