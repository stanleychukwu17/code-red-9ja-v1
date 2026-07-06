import { Pressable, Text, View } from "react-native";

import { AppAvatar } from "@/components/app/social-primitives";
import { cn } from "@/components/ui/cn";

export function PollingUnitTile({
  name,
  votes,
  rank,
  image,
  onPress,
  className,
}: {
  name: string;
  votes: string;
  rank: string;
  image: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      className={cn("h-16 px-4 flex-row items-center", className)}
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="text-[16px] text-[#161315]">{name}</Text>
      </View>
      <AppAvatar name={name} source={image} size={30} className="mr-4" />
      <Text className="text-[16px] w-24 font-bold text-[#161315]">{votes}</Text>
      <Text className="text-[16px] text-right w-8 font-bold text-black/40">
        {rank}
      </Text>
    </Pressable>
  );
}
