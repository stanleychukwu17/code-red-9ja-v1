import { ScreenHeader } from "@/components/app/screen-headers";
import { cn } from "@/components/ui/cn";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationItem = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  message: string;
  section: "Today" | "Yesterday";
  initiallyUnread: boolean;
};

const COMMENT_TEXT =
  'Commented on your post saying "I don\'t know where this thugs come from".';

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "kennedy",
    name: "Kennedy Musa",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    time: "2h",
    message: COMMENT_TEXT,
    section: "Today",
    initiallyUnread: true,
  },
  {
    id: "jerry",
    name: "Jerry Eze",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    time: "10h",
    message: COMMENT_TEXT,
    section: "Today",
    initiallyUnread: true,
  },
  {
    id: "susan",
    name: "Susan Folake",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    time: "20h",
    message: COMMENT_TEXT,
    section: "Yesterday",
    initiallyUnread: true,
  },
  {
    id: "faith",
    name: "Faith Mutumina",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    time: "1d",
    message: COMMENT_TEXT,
    section: "Yesterday",
    initiallyUnread: false,
  },
  {
    id: "david",
    name: "David Chizorba",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    time: "1d",
    message: COMMENT_TEXT,
    section: "Yesterday",
    initiallyUnread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [showUnreadHighlight, setShowUnreadHighlight] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUnreadHighlight(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const sections = useMemo(
    () => [
      {
        title: "Today" as const,
        items: NOTIFICATIONS.filter((item) => item.section === "Today"),
      },
      {
        title: "Yesterday" as const,
        items: NOTIFICATIONS.filter((item) => item.section === "Yesterday"),
      },
    ],
    [],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScreenHeader
        title="Notifications"
        onBackPress={() => router.back()}
        showBackButton
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} className="mb-3">
            <View className="h-10 flex-row items-center px-4">
              <Text className="text-[18px] font-bold text-[#39363A]">
                {section.title}
              </Text>
            </View>

            {section.items.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                unread={item.initiallyUnread && showUnreadHighlight}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({
  item,
  unread,
}: {
  item: NotificationItem;
  unread: boolean;
}) {
  const progress = useRef(new Animated.Value(unread ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: unread ? 0 : 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, unread]);

  return (
    <Animated.View
      className={cn(
        "bg-background",
        unread && "bg-red-500/10 transition-colors duration-300",
      )}
    >
      <View className="flex-row items-start px-4 py-3 gap-3 ">
        <Image
          source={item.avatar}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: 40, height: 40, borderRadius: 999 }}
        />

        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-[16px] leading-7 text-[#2A2729]">
              <Text className="font-medium text-[#161415]">{item.name}</Text>
              <Text className="text-[#9A9699]">{` · ${item.time}`}</Text>
            </Text>

            <View
              className={cn(
                "h-3 w-3 rounded-full bg-transparent",
                unread && "bg-[#FF4768]",
              )}
            />
          </View>
          <Text className="text-[16px] leading-7 text-[#7F7B7E]">
            {item.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
