import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppAvatar } from "@/components/app/social-primitives";
import { Button } from "@/components/ui/button";
import { Image } from "expo-image";

const AUTH_USER_IMAGE =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg";

export default function PostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [text, setText] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const composerMaxHeight = Math.max(
    height - insets.top - insets.bottom - 310,
    180,
  );

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.uri) {
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.uri) {
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingTop: Math.max(insets.top, 12),
              paddingHorizontal: 12,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-6 mt-1 flex-row items-center justify-between">
              <Pressable hitSlop={8} onPress={() => router.back()}>
                <MaterialIcons name="close" size={24} color="#716C70" />
              </Pressable>

              <View className="flex-row items-center gap-4">
                <Button
                  label="Post"
                  variant="secondary"
                  size="md"
                  fullWidth={false}
                  className="h-[36px] rounded-full px-5"
                  textClassName="text-[16px] font-semibold"
                />
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <AppAvatar
                name="Chukwu Daniel"
                size={40}
                source={AUTH_USER_IMAGE}
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              />
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="What's happening?"
                placeholderTextColor="#625D60"
                multiline
                scrollEnabled
                autoFocus
                textAlignVertical="top"
                className="flex-1 text-[18px] leading-8 text-[#242123]"
                style={{ maxHeight: composerMaxHeight }}
              />
            </View>

            {mediaUri ? (
              <View className="mt-4 overflow-hidden rounded-[14px] bg-[#E7E7E6]">
                {mediaType === "video" ? (
                  <View className="h-[220px] items-center justify-center bg-[#D8D8D7] px-4">
                    <MaterialIcons name="videocam" size={40} color="#6B6668" />
                    <Text className="mt-2 text-center text-[14px] font-semibold text-[#4A4648]">
                      Video selected
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: mediaUri }}
                    style={{ width: "100%", height: 220 }}
                    contentFit="cover"
                  />
                )}
                <Pressable
                  onPress={() => {
                    setMediaUri(null);
                    setMediaType(null);
                  }}
                  hitSlop={10}
                  className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60"
                >
                  <MaterialIcons name="close" size={18} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            {text.length === 0 && (
              <View className="mt-5 rounded-[12px] bg-[#CFECDD] px-4 py-3">
                <Text className="text-[16px] font-medium leading-7 text-[#203029]">
                  Tell us what&apos;s happening at your polling unit
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="border-t* border-[#E7E0E5]* bg-background px-3 pb-3 pt-2">
            <View className="mt-auto flex-row gap-3">
              <Pressable
                onPress={pickFromGallery}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#E7E7E6] py-5"
              >
                <MaterialIcons name="image" size={26} color="#8E898B" />

                <Text className="text-center text-[18px] font-bold text-[#203029]">
                  Gallery
                </Text>
              </Pressable>
              <Pressable
                onPress={takePhoto}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#E7E7E6] py-5"
              >
                <MaterialIcons name="camera-alt" size={26} color="#8E898B" />
                <Text className="text-center text-[18px] font-bold text-[#203029]">
                  Camera
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
