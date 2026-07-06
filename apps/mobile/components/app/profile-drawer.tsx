import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { FlowSelectField } from "@/components/onboarding/flow-screen";

const DRAWER_WIDTH = 340;

type ProfileDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onProfilePress: () => void;
  currentElection: string;
  onElectionPress: () => void;
  onDidVotePress: () => void;
  onVotingIntentPress: () => void;
};

const PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop";
const ELECTION_OPTIONS = [
  "Presidential Election",
  "House of Rep Election",
  "Senatorial Election",
] as const;

export function ProfileDrawer({
  visible,
  onClose,
  onProfilePress,
  currentElection,
  onElectionPress,
  onDidVotePress,
  onVotingIntentPress,
}: ProfileDrawerProps) {
  const progress = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = withTiming(1, { duration: 240 });
      return;
    }

    progress.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) {
        runOnJS(setIsMounted)(false);
      }
    });
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-DRAWER_WIDTH, 0]),
      },
    ],
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        <Animated.View
          className="absolute inset-0 bg-black/30"
          style={backdropStyle}
        />

        <Pressable className="absolute inset-0" onPress={onClose} />

        <Animated.View
          className="h-full bg-surface px-5 pb-6 pt-20"
          style={[{ width: DRAWER_WIDTH, maxWidth: "86%" }, drawerStyle]}
        >
          <View className="flex-1">
            <View className="flex-row items-center">
              <Image
                source={PROFILE_IMAGE}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={{ width: 56, height: 56, borderRadius: 999, marginRight: 18 }}
              />
              <View className="flex-1">
                <Text className="text-[18px] font-bold text-[#171416]">
                  Daniel Chukwu
                </Text>
                <Text className="mt-1 text-[16px] text-[#8B8589]">Online</Text>
              </View>
            </View>

            <Pressable
              className="mt-12 flex-row items-center"
              onPress={() => {
                onClose();
                onProfilePress();
              }}
            >
              <MaterialIcons
                name="account-circle"
                size={28}
                color="#555155"
                style={{ marginRight: 18 }}
              />
              <Text className="text-[20px] font-bold text-[#171416]">Profile</Text>
            </Pressable>

            <View className="mt-auto gap-3">
              <Button
                label="Did you vote?"
                variant="neutral"
                size="lg"
                className="h-[66px] rounded-[18px] bg-[#EFEFEF]"
                textClassName="text-[18px] font-bold text-[#173028]"
                onPress={onDidVotePress}
              />
              <Button
                label="Will you be voting?"
                variant="neutral"
                size="lg"
                className="h-[66px] rounded-[18px] bg-[#EFEFEF]"
                textClassName="text-[18px] font-bold text-[#173028]"
                onPress={onVotingIntentPress}
              />
              <Button
                label="Become a PU Agent"
                size="lg"
                className="h-[66px] rounded-[18px] bg-[#10D98A]"
                textClassName="text-[18px] font-bold text-[#173028]"
              />
              <FlowSelectField
                value={currentElection}
                placeholder="Select election"
                onPress={onElectionPress}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
