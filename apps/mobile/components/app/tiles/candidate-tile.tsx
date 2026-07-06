import { Image } from "expo-image";
import { Pressable, Text } from "react-native";

import { cn } from "@/components/ui/cn";

export function CandidateTile({
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
      className={cn("flex-row items-center h-[60px] px-4 gap-3", className)}
      onPress={onPress}
    >
      <Image
        source={image}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
        }}
      />
      <Text className="flex-1 text-[16px] line-clamp-1 text-black/80">
        {name}
      </Text>
      <Text className="mr-6 text-[16px] font-bold text-black/80">{votes}</Text>
      <Text className="text-[16px] font-bold text-black/40">{rank}</Text>
    </Pressable>
  );
}
