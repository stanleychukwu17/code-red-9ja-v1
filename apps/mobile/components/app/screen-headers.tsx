import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/components/ui/cn";
import { NavbarNotificationIcon } from "@/components/ui/icons";

const AUTH_USER_IMAGE =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";

const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop";

export function ProfileHeader({
  className,
  title = "My Profile",
  showBackButton = false,
  onBackPress,
}: {
  className?: string;
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}) {
  return (
    <View
      className={cn(
        "relative h-14 flex-row items-center justify-center",
        className,
      )}
    >
      {showBackButton ? (
        <Pressable
          className="absolute left-0 h-12 px-5 pr-7 items-start justify-center"
          hitSlop={8}
          onPress={onBackPress}
        >
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#464043" />
        </Pressable>
      ) : null}
      <Text className="text-[20px] font-bold text-[#242123]">{title}</Text>
    </View>
  );
}

export function ScreenHeader({
  className,
  title = "Header",
  showBackButton = false,
  onBackPress,
}: {
  className?: string;
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}) {
  return (
    <View
      className={cn(
        "relative h-14 flex-row items-center justify-center",
        className,
      )}
    >
      {showBackButton ? (
        <Pressable
          className="absolute left-0 h-12 px-5 pr-7 items-start justify-center"
          hitSlop={8}
          onPress={onBackPress}
        >
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#464043" />
        </Pressable>
      ) : null}
      <Text className="text-[20px] font-bold text-[#242123]">{title}</Text>
    </View>
  );
}

export function DashboardHeader({
  className,
  onAvatarPress,
  onUsersPress,
  onNotificationsPress,
}: {
  className?: string;
  onAvatarPress: () => void;
  onUsersPress: () => void;
  onNotificationsPress: () => void;
}) {
  return (
    <View
      className={cn(
        "h-14 mb-2 flex-row items-center justify-between",
        className,
      )}
    >
      <Pressable className="flex-row items-center" onPress={onAvatarPress}>
        <Image
          source={AUTH_USER_IMAGE}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: 34, height: 34, borderRadius: 999, marginRight: 12 }}
        />
        <Text className="text-[14px] font-semibold text-[#222021]">
          Hi Lotta, Free 9ja
        </Text>
      </Pressable>

      <View className="flex-row items-center">
        <Pressable
          className="flex-row items-centerh-12 pl-4"
          hitSlop={8}
          onPress={onUsersPress}
        >
          <MaterialIcons
            name="public"
            size={15}
            color="#48BF74"
            style={{ marginRight: 8 }}
          />
          <Text className="text-[14px] font-medium text-[#222021]">
            2.31m online
          </Text>
        </Pressable>

        <NotificationButton count={3} onPress={onNotificationsPress} />
      </View>
    </View>
  );
}

export function NotificationButton({
  count,
  onPress,
}: {
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="relative px-5 h-12 flex items-center justify-center"
      hitSlop={8}
      onPress={onPress}
    >
      <NavbarNotificationIcon width={24} height={24} color="#161415" />
      <View className="absolute right-3 -top-0 h-5 min-w-7 items-center justify-center rounded-xl bg-[#FF4768]">
        <Text className="text-[13px] font-bold text-white">{count}</Text>
      </View>
    </Pressable>
  );
}

export function FeedHeader({
  onUsersPress,
  onNotificationsPress,
}: {
  onUsersPress: () => void;
  onNotificationsPress: () => void;
}) {
  return (
    <View className="h-14 pl-4 flex-row items-center justify-between">
      <Image
        source={AUTH_IMAGE}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: 34, height: 34, borderRadius: 999 }}
      />
      <Text className="text-[20px] font-bold text-[#242123]">Free 9ja</Text>
      <NotificationButton count={3} onPress={onNotificationsPress} />
    </View>
  );
}

export function PostDetailHeader({
  title,
  onBackPress,
}: {
  title: string;
  onBackPress: () => void;
}) {
  return (
    <View className="relative h-12 items-center justify-center">
      <Pressable
        className="absolute left-0 h-12 px-5 pr-7 items-start justify-center"
        hitSlop={8}
        onPress={onBackPress}
      >
        <MaterialIcons name="arrow-back-ios-new" size={18} color="#464043" />
      </Pressable>
      <Text className="text-[20px] font-bold text-[#302D2F]">{title}</Text>
    </View>
  );
}
