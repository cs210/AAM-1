import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authScreenStyles as styles } from '@/lib/auth-screen-styles';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  /** Second line under “Museum&” */
  subtitle: string;
  /** Optional supporting line (e.g. sign-up welcome copy) */
  description?: string;
};

export function AuthScreenLayout({ children, subtitle, description }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.title}>Museum&</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
