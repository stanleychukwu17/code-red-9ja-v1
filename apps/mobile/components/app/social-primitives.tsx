import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ComponentType } from "react";
import {
  Pressable,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from "react-native";

import { cn } from "@/components/ui/cn";
import { NavbarNotificationIcon } from "@/components/ui/icons";

const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;
const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;

type AvatarProps = {
  name: string;
  size?: number;
  color?: string;
  textClassName?: string;
  source?: React.ComponentProps<typeof Image>["source"];
  imageProps?: Omit<React.ComponentProps<typeof Image>, "source">;
  className?: string;
  style?: ViewProps["style"];
};

export type FeedPost = {
  id: string;
  author: string;
  meta?: string;
  timestamp: string;
  content: string;
  likes: string;
  comments: string;
  avatarColor: string;
  avatarImage?: string;
  image?: string;
  authorTextColor?: string;
  topRightText?: string;
  tags?: string[];
};

type PostCardProps = {
  post: FeedPost;
  onPress?: () => void;
  showBorder?: boolean;
};

export type CommentProps = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  content: string;
  likes: string;
};

export const FEED_POSTS: FeedPost[] = [
  {
    id: "nathan-bwala",
    author: "Nathan Bwala",
    meta: "KOFAR FADA...",
    timestamp: "8:20 AM, July 2026",
    content:
      "Got to my polling unit by 7:10am and the queue is already long. People are determined this time. Let’s do this 🇳🇬",
    likes: "1.2k",
    comments: "178",
    avatarColor: "#30374A",
    avatarImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=900&fit=crop",
  },
  {
    id: "aisha-yusuf",
    author: "Aisha Yusuf",
    meta: "Jefabo",
    timestamp: "9:31 PM, Jan 23",
    content:
      "Some party members at my polling unit are currently buying votes for Jonathan right now as I speak, 10K per vote.",
    likes: "71",
    comments: "12",
    avatarColor: "#C56B74",
    avatarImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  },
  {
    id: "jessica-faith",
    author: "Jessica Faith",
    meta: "PU 014",
    timestamp: "7:10 AM, Jan 23",
    content:
      "INEC officials still not here at PU 014, we’ve been waiting since 8am.",
    likes: "35",
    comments: "7",
    avatarColor: "#2E6AD1",
    avatarImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=900&fit=crop",
  },
] as const;

export const POST_COMMENTS: CommentProps[] = [
  {
    id: "comment-1",
    author: "Aisha Yusuf",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    timestamp: "9:31PM, Jan 23",
    content:
      "We really are determined sir. All we’ve ever wanted was a free and fair election. Now we have it, is that too much to ask for as citizens of Nigeria 🙌",
    likes: "71",
  },
  {
    id: "comment-2",
    author: "Aisha Yusuf",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    timestamp: "9:31PM, Jan 23",
    content: "👏👏👏",
    likes: "12",
  },
] as const;

export function AppAvatar({
  name,
  size = 48,
  color = "#C68E56",
  textClassName,
  source,
  imageProps,
  className,
  style,
}: AvatarProps) {
  const hasImageSource =
    typeof source === "string" ? source.trim().length > 0 : Boolean(source);

  const { style: imageStyle, ...restImageProps } = imageProps ?? {};
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <StyledView
      className={cn(
        "items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={[
        {
          width: size,
          height: size,
          backgroundColor: hasImageSource ? "transparent" : color,
        },
        style,
      ]}
    >
      {hasImageSource ? (
        <Image
          source={source}
          contentFit="cover"
          cachePolicy="memory-disk"
          {...restImageProps}
          style={[{ width: size, height: size }, imageStyle]}
        />
      ) : (
        <StyledText className={cn("font-bold text-white", textClassName)}>
          {initials}
        </StyledText>
      )}
    </StyledView>
  );
}

export function NotificationButton({ count = 3 }: { count?: number }) {
  return (
    <StyledView className="relative">
      <NavbarNotificationIcon width={22} height={22} color="#161415" />
      <StyledView className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-[#FF4768]">
        <StyledText className="text-[12px] font-bold text-white">
          {count}
        </StyledText>
      </StyledView>
    </StyledView>
  );
}

export function PostCard({ post, onPress, showBorder = true }: PostCardProps) {
  const topRightText = post.topRightText ?? post.meta;

  return (
    <StyledPressable className={cn("px-3 py-5")} onPress={onPress}>
      <StyledView className="flex-row gap-3">
        <AppAvatar
          name={post.author}
          size={46}
          color={post.avatarColor}
          textClassName="text-sm"
          source={post.avatarImage}
        />
        <StyledView className="flex-1">
          <StyledView className="flex-row items-start justify-between">
            <StyledText
              className="pr-4 text-[16px] font-semibold"
              style={{ color: post.authorTextColor ?? "#151314" }}
            >
              {post.author}
            </StyledText>
            {topRightText ? (
              <StyledText className="text-[16px] text-[#8B8589]">
                {topRightText}
              </StyledText>
            ) : null}
          </StyledView>

          <StyledText className="text-[16px] leading-7 text-[#202021]">
            {post.content}
          </StyledText>

          {post.tags?.length ? (
            <StyledView className="mt-3 flex-row flex-wrap gap-2">
              {post.tags.map((tag) => (
                <StyledView
                  key={`${post.id}-${tag}`}
                  className="rounded-[10px] bg-[#E8E4E8] px-3 py-2"
                >
                  <StyledText className="text-[14px] leading-4 text-[#3A3739]">
                    {tag}
                  </StyledText>
                </StyledView>
              ))}
            </StyledView>
          ) : null}

          {post.image ? (
            <Image
              source={post.image}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{
                width: "100%",
                height: 230,
                borderRadius: 12,
                marginTop: 12,
              }}
            />
          ) : null}

          <StyledView className="mt-4 flex-row items-center gap-8">
            <Reaction icon="favorite-border" value={post.likes} />
            <Reaction icon="chat-bubble-outline" value={post.comments} />
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledPressable>
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
    <StyledView className="flex-row items-center">
      <MaterialIcons
        name={icon}
        size={24}
        color="#7B7679"
        style={{ marginRight: 8 }}
      />
      <StyledText className="text-[14px] font-medium text-[#151314]">
        {value}
      </StyledText>
    </StyledView>
  );
}

export function SearchTabs({
  active,
  onChange,
}: {
  active: "People" | "Polling Unit" | "State";
  onChange: (value: "People" | "Polling Unit" | "State") => void;
}) {
  const tabs = ["People", "Polling Unit", "State"] as const;

  return (
    <StyledView className="mb-5 flex-row gap-3 px-4">
      {tabs.map((tab) => {
        const selected = tab === active;

        return (
          <StyledPressable
            key={tab}
            onPress={() => onChange(tab)}
            className={cn(
              "rounded-full px-5 py-3",
              selected ? "bg-[#E4EFE7]" : "bg-transparent",
            )}
          >
            <StyledText
              className={cn(
                "text-[16px] font-bold",
                selected ? "text-[#2F7351]" : "text-[#A4A0A2]",
              )}
            >
              {tab}
            </StyledText>
          </StyledPressable>
        );
      })}
    </StyledView>
  );
}
