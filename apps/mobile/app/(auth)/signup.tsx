import { useRouter } from "expo-router";
import { useState } from 'react';

import { AuthField, AuthScreen } from '@/components/auth/auth-screen';

export default function SignupScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <AuthScreen
      title="Create an account"
      subtitle="Make your vote count"
      primaryAction={{
        label: 'Sign up',
        onPress: () => router.push('/verify-otp?flow=signup'),
      }}
      footerLinks={[{ label: 'Already have an account? Log in', href: '/login', accent: true }]}>
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
      <AuthField
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
    </AuthScreen>
  );
}
