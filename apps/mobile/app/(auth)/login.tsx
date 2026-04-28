import { useRouter } from "expo-router";
import { useState } from "react";

import { AuthField, AuthScreen } from "@/components/auth/auth-screen";

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthScreen
      title="Log in"
      subtitle="Make your vote count"
      primaryAction={{
        label: "Log in",
        onPress: () => router.push("/verify-otp?flow=login"),
      }}
      footerLinks={[
        {
          label: "Don't have an account?",
          action: "Sign up",
          href: "/signup",
          accent: true,
        },
        { label: "Forgot password", href: "/forgot-password" },
      ]}
    >
      <AuthField
        placeholder="Email or Phone number"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <AuthField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
    </AuthScreen>
  );
}
