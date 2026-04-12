import { useRouter } from "expo-router";
import { useState } from "react";

import {
  FlowPickerSheet,
  FlowScreen,
  FlowSelectField,
} from "@/components/onboarding/flow-screen";

const COUNTRIES = ["Country of residence", "Nigeria", "Ghana"];
const STATES = ["State of residence", "Lagos", "Abuja", "Oyo"];

export default function LocationScreen() {
  const router = useRouter();
  const [country, setCountry] = useState("Country of residence");
  const [state, setState] = useState("State of residence");
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [showStateSheet, setShowStateSheet] = useState(false);

  return (
    <>
      <FlowScreen
        title="Add your location"
        subtitle="Enter where you are currently located right now."
        icon="map-pin"
        onBackPress={() => router.back()}
        primaryAction={{
          label: "Continue",
          onPress: () => router.replace("/(app)/(tabs)/dashboard"),
        }}
      >
        <FlowSelectField
          value={country}
          placeholder="Country of residence"
          onPress={() => setShowCountrySheet(true)}
        />
        <FlowSelectField
          value={state}
          placeholder="State of residence"
          onPress={() => setShowStateSheet(true)}
        />
      </FlowScreen>

      <FlowPickerSheet
        visible={showCountrySheet}
        onClose={() => setShowCountrySheet(false)}
        selectedValue={country}
        title="Country of residence"
        options={COUNTRIES.slice(1)}
        onSelect={setCountry}
      />
      <FlowPickerSheet
        visible={showStateSheet}
        onClose={() => setShowStateSheet(false)}
        selectedValue={state}
        title="State of residence"
        options={STATES.slice(1)}
        onSelect={setState}
      />
    </>
  );
}
