import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ImageBackground,
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
    <View style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/login-background.jpg')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>YAMI</Text>
              <Text style={styles.subtitle}>Your Cultural Passport</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formCard}>
                <View style={styles.formInner}>
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      placeholder="your@email.com"
                      placeholderTextColor="#9CA3AF"
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
                        style={({ pressed }) => [
                          styles.forgotButton,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.forgotText}>Forgot?</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      ref={passwordInputRef}
                      placeholder="*******"
                      placeholderTextColor="#9CA3AF"
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
                    style={({ pressed }) => [
                      styles.signUpButton,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.signUpText}>
                      Don't have an account?{' '}
                      <Text style={styles.signUpTextBold}>Sign up</Text>
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    transform: [{ scale: 1.15 }, { translateY: -30 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  formContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  formCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formInner: {
    padding: 24,
    gap: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
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
    fontWeight: '500',
    color: '#374151',
  },
  forgotButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotText: {
    fontSize: 14,
    color: '#6B7280',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  signInButton: {
    backgroundColor: '#A67C52',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  signUpTextBold: {
    fontWeight: '600',
    color: '#1F2937',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
});