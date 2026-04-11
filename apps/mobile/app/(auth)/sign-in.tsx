import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { AUTH_PLACEHOLDER, authScreenStyles as styles } from '@/lib/auth-screen-styles';
import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export default function SignInScreen() {
  const passwordInputRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!email || !password || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      setIsLoading(false);

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(signInError.message ?? 'Sign in failed');
        return;
      }

      if (data) {
        router.replace('/post-auth');
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <AuthScreenLayout subtitle="Your Cultural Passport">
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="your@email.com"
          placeholderTextColor={AUTH_PLACEHOLDER}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          onSubmitEditing={onEmailSubmitEditing}
          returnKeyType="next"
          style={styles.input}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Password</Text>
          <Pressable
            onPress={() => router.push('/forgot-password')}
            style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}>
            <Text style={styles.forgotText}>Forgot?</Text>
          </Pressable>
        </View>
        <TextInput
          ref={passwordInputRef}
          placeholder="••••••••"
          placeholderTextColor={AUTH_PLACEHOLDER}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          isLoading && styles.buttonDisabled,
        ]}>
        <Text style={styles.primaryButtonText}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/sign-up')}
        style={({ pressed }) => [styles.footerLinkButton, pressed && styles.pressed]}>
        <Text style={styles.footerLinkText}>
          {"Don't have an account? "}
          <Text style={styles.footerLinkBold}>Sign up</Text>
        </Text>
      </Pressable>
    </AuthScreenLayout>
  );
}
