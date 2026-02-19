"use client";

import { authClient } from "@/lib/auth-client";
import { Text as UiText } from "@/components/ui/text";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";
import { View } from "react-native";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

  if (!convexUrl || !convexSiteUrl) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <UiText className="text-center text-lg font-semibold text-foreground">
          Missing Convex environment variables
        </UiText>
        <UiText className="text-center text-muted-foreground">
          Set EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CONVEX_SITE_URL in your Expo env.
        </UiText>
      </View>
    );
  }

  const convex = useMemo(
    () =>
      new ConvexReactClient(convexUrl, {
        expectAuth: false,
        unsavedChangesWarning: false,
      }),
    [convexUrl]
  );

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}