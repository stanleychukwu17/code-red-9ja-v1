import { useRouter } from "expo-router";
import { useState } from "react";

import {
  FlowField,
  FlowPickerSheet,
  FlowScreen,
  FlowSelectField,
  NativeDateField,
} from "@/components/onboarding/flow-screen";

export default function UserDetailsScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showGenderSheet, setShowGenderSheet] = useState(false);

  return (
    <>
      <FlowScreen
        title="Add your details"
        subtitle="Enter your full government name & gender."
        icon="user"
        onBackPress={() => router.back()}
        primaryAction={{
          label: "Continue",
          onPress: () => router.push("/nin-verification"),
        }}
      >
        <FlowField
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoFocus
        />
        <FlowField
          placeholder="Surname"
          value={surname}
          onChangeText={setSurname}
        />
        <FlowField
          placeholder="Other names"
          value={otherNames}
          onChangeText={setOtherNames}
        />
        <FlowSelectField
          placeholder="Gender"
          value={gender}
          onPress={() => setShowGenderSheet(true)}
        />
        <NativeDateField
          placeholder="Select date of birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
        />
      </FlowScreen>

      <FlowPickerSheet
        visible={showGenderSheet}
        onClose={() => setShowGenderSheet(false)}
        selectedValue={gender || "Male"}
        title="Gender"
        options={["Male", "Female"]}
        onSelect={setGender}
      />
    </>
  );
}
