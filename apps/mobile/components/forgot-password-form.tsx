import { AUTH_PLACEHOLDER, authScreenStyles as styles } from '@/lib/auth-screen-styles';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');

  function onSubmit() {
    // TODO: wire to Better Auth forgot-password / email flow when available
  }

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={AUTH_PLACEHOLDER}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Send reset link</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/sign-in')}
        style={({ pressed }) => [styles.footerLinkButton, pressed && styles.pressed]}>
        <Text style={[styles.footerLinkText, styles.footerLinkBold]}>Back to sign in</Text>
      </Pressable>
    </>
  );
}
