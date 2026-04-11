import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#F7F4EF';
const SURFACE = '#FFFFFF';
const TEXT_PRIMARY = '#1C1917';
const TEXT_MUTED = '#78716C';
const BORDER = '#E7E5E4';
const ACCENT = '#C4713B';

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.title}>Museum&</Text>
            <Text style={styles.subtitle}>Your Cultural Passport</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor="#A8A29E"
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
                placeholderTextColor="#A8A29E"
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
                styles.signInButton,
                pressed && styles.pressed,
                isLoading && styles.buttonDisabled,
              ]}>
              <Text style={styles.signInButtonText}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/sign-up')}
              style={({ pressed }) => [styles.signUpButton, pressed && styles.pressed]}>
              <Text style={styles.signUpText}>
                {"Don't have an account? "}
                <Text style={styles.signUpTextBold}>Sign up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  hero: {
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  forgotButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: ACCENT,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  signInButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  signUpTextBold: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
});
