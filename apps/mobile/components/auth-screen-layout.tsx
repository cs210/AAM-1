import { Text } from '@/components/ui/text';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  /** Second line under “Museum&” */
  subtitle: string;
  /** Optional supporting line (e.g. sign-up welcome copy) */
  description?: string;
};

export function AuthScreenLayout({ children, subtitle, description }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className="flex-1 bg-background"
      style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}>
        <ScrollView
          className="flex-1 bg-background"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 }}>
          {/* Avoid flex-1/grow inside ScrollView — on RN it often collapses to zero height. */}
          <View className="items-center pb-7 pt-3">
            <Text className="mb-2 text-center text-4xl font-bold tracking-tight text-stone-900">
              Museum&
            </Text>
            <Text className="text-center text-base leading-snug text-stone-600">{subtitle}</Text>
            {description ? (
              <Text className="mt-2.5 px-2 text-center text-sm leading-snug text-stone-600">
                {description}
              </Text>
            ) : null}
          </View>

          <View className="w-full max-w-lg gap-5 self-center">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
