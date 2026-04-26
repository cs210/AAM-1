import { AuthBackdrop } from '@/components/auth-backdrop';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  /** Second line under "Museum&" */
  subtitle: string;
  /** Optional supporting line (e.g. sign-up welcome copy) */
  description?: string;
};

export function AuthScreenLayout({ children, subtitle, description }: AuthScreenLayoutProps) {
  return (
    <View className="relative flex-1 bg-background" style={{ flex: 1 }}>
      <AuthBackdrop />
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        className="z-10 flex-1"
        style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}>
          <ScrollView
            className="flex-1"
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 }}>
            <View className="items-center pb-8 pt-6">
              <View className="mb-5 flex-row items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Cultural Passport
                </Text>
              </View>

              <View className="flex-row items-baseline justify-center">
                <Text className="text-center text-5xl font-bold tracking-tight text-foreground">
                  Museum
                </Text>
                <Text className="text-center text-5xl font-bold tracking-tight text-primary">
                  &
                </Text>
              </View>

              <Text className="mt-3 text-center text-base leading-snug text-muted-foreground">
                {subtitle}
              </Text>
              {description ? (
                <Text className="mt-2.5 px-2 text-center text-sm leading-snug text-muted-foreground">
                  {description}
                </Text>
              ) : null}
            </View>

            <View className="w-full max-w-lg gap-5 self-center">{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
