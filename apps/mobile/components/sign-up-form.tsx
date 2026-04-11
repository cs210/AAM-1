import { AUTH_PLACEHOLDER, authScreenStyles as styles } from '@/lib/auth-screen-styles';
import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export function SignUpForm() {
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  function onNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!name || !email || !password || isLoading) return;

    setError(null);
    setIsLoading(true);
    const { data, error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed');
      return;
    }

    if (data) {
      router.replace('/post-auth');
    }
  }

  return (
    <>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={AUTH_PLACEHOLDER}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={onNameSubmitEditing}
          style={styles.input}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          ref={emailInputRef}
          placeholder="you@example.com"
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
        <Text style={styles.label}>Password</Text>
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
          {isLoading ? 'Creating account...' : 'Continue'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/sign-in')}
        style={({ pressed }) => [styles.footerLinkButton, pressed && styles.pressed]}>
        <Text style={styles.footerLinkText}>
          {'Already have an account? '}
          <Text style={styles.footerLinkBold}>Sign in</Text>
        </Text>
      </Pressable>
    </>
  );
}
