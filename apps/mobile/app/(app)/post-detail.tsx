import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CommentProps,
  FEED_POSTS,
  FeedPost,
  POST_COMMENTS,
} from "@/components/app/social-primitives";
import { PostDetailHeader } from "@/components/app/screen-headers";

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const post = useMemo(
    () => FEED_POSTS.find((item) => item.id === params.id) ?? FEED_POSTS[0],
    [params.id],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1">
        <PostDetailHeader title="Post" onBackPress={() => router.back()} />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          <PostDetailCard post={post} />
          <View className="px-3">
            <Text className="h-10 mt-8 text-[20px] font-medium text-[#171416]">
              Comments{" "}
              <Text className="text-[#8B8589]">{POST_COMMENTS.length}</Text>
            </Text>

            <View className="mt-4 gap-y-7">
              {POST_COMMENTS.map((comment) => (
                <CommentCard comment={comment} key={comment.id} />
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-black/6 bg-surface px-5 pb-6 pt-3">
          <View className="flex-row items-center">
            <Image
              source="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop"
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{ width: 42, height: 42, borderRadius: 999 }}
            />
            <View className="ml-4 flex-1 flex-row items-center rounded-full bg-[#ECE8EC] px-5 py-3">
              <TextInput
                placeholder="Add your comment..."
                placeholderTextColor="#A3A0A4"
                className="flex-1 text-[18px] text-[#242123]"
              />
              <View className="ml-4 h-10 w-10 items-center justify-center rounded-full bg-primary/50">
                <MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CommentCard({ comment }: { comment: CommentProps }) {
  return (
    <View key={comment.id} className="flex-row gap-3 items-start">
      <Image
        source={comment.avatar}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: 42, height: 42, borderRadius: 999 }}
      />
      <View className="flex-1">
        <View className="mb-1 flex-row items-start justify-between">
          <Text className="pr-4 text-[16px] font-medium text-[#171416]">
            {comment.author}
          </Text>
          <Text className="text-[14px] text-[#8B8589]">
            {comment.timestamp}
          </Text>
        </View>
        <Text className="text-[16px] leading-7 text-[#242123]">
          {comment.content}
        </Text>
        <View className="mt-3 flex-row items-center">
          <Reaction icon="favorite-border" value={comment.likes} />
          <Text className="mx-4 text-[#C6C1C4]">|</Text>
          <Text className="text-[14px] font-bold text-[#171416]">Reply</Text>
        </View>
      </View>
    </View>
  );
}
function PostDetailCard({ post }: { post: FeedPost }) {
  return (
    <View className="px-3">
      <View className="mt-6 gap-3 flex-row">
        <Image
          source={post.avatarImage}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: 46, height: 46, borderRadius: 999 }}
        />
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="pr-4">
              <Text className="text-[16px] font-semibold text-[#171416]">
                {post.author}
              </Text>
              <Text className="mt-1 text-[14px] text-[#8B8589]">
                {post.timestamp}
              </Text>
            </View>
            <Text className="text-[16px] text-[#8B8589]">{post.meta}</Text>
          </View>
        </View>
      </View>

      <Text className="mt-2 text-[17px] leading-7 text-[#242123]">
        {post.content}
      </Text>

      {post.image ? (
        <Image
          source={post.image}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{
            width: "100%",
            height: 290,
            borderRadius: 12,
            marginTop: 8,
          }}
        />
      ) : null}

      <View className="mt-4 flex-row items-center gap-8">
        <Reaction icon="favorite-border" value={post.likes} />
        <Reaction icon="chat-bubble-outline" value={post.comments} />
      </View>
    </View>
  );
}

function Reaction({
  icon,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <MaterialIcons
        name={icon}
        size={24}
        color="#7B7679"
        style={{ marginRight: 8 }}
      />
      <Text className="text-[14px] font-medium text-[#151314]">{value}</Text>
    </View>
  );
}
