import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { FeedHeader } from "@/components/app/screen-headers";
import { FEED_POSTS, PostCard } from "@/components/app/social-primitives";
import { cn } from "@/components/ui/cn";

const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop";

export default function FeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1">
        <FeedHeader
          onUsersPress={() => null}
          onNotificationsPress={() => router.push("/(app)/notifications")}
        />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <WhatsHappening className="border-b border-black/5 px-4 mb-1 pb-6" />

          {FEED_POSTS.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() =>
                router.push({
                  pathname: "/post-detail",
                  params: { id: post.id },
                })
              }
            />
          ))}
        </ScrollView>

        <AppBottomNav />
      </View>
    </SafeAreaView>
  );
}

export function WhatsHappening({ className }: { className?: string }) {
  return (
    <View className={cn("flex-row gap-3 items-center", className)}>
      <Image
        source={AUTH_IMAGE}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: 40, height: 40, borderRadius: 999 }}
      />
      <Text className="flex-1 text-xl text-[#5F5A5D]">
        What&apos;s happening?
      </Text>
      <MaterialIcons name="image" size={28} color="#8E898B" />
    </View>
  );
}
