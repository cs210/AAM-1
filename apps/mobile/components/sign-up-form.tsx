import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { isUsernameReadyForSubmit, UsernameField } from '@/components/username-field';
import { authClient } from '@/lib/auth-client';
import { normalizeUsernameInput } from '@/lib/username';
import { api } from '@packages/backend/convex/_generated/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

const PENDING_USERNAME_KEY = 'pendingUsername';

export function SignUpForm() {
  const usernameInputRef = React.useRef<TextInput>(null);
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [debouncedUsername, setDebouncedUsername] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(normalizeUsernameInput(username)), 300);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameAvailability = useQuery(
    api.userProfiles.isUsernameAvailable,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : 'skip'
  );

  const canSubmit =
    Boolean(name.trim() && email.trim() && password) &&
    isUsernameReadyForSubmit(username, usernameAvailability) &&
    !isLoading;

  function onNameSubmitEditing() {
    usernameInputRef.current?.focus();
  }

  function onUsernameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsLoading(true);
    const normalizedUsername = normalizeUsernameInput(username);
    const { data, error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setIsLoading(false);
      setError(signUpError.message ?? 'Sign up failed');
      return;
    }

    if (data) {
      try {
        await AsyncStorage.setItem(PENDING_USERNAME_KEY, normalizedUsername);
      } catch (storageError) {
        console.error('Failed to persist pending username:', storageError);
      }
      router.replace('/post-auth');
    }

    setIsLoading(false);
  }

  return (
    <>
      {error ? (
        <View className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
          <Text className="text-center text-sm text-destructive">{error}</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Label nativeID="sign-up-name">Name</Label>
        <Input
          nativeID="sign-up-name"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={onNameSubmitEditing}
        />
      </View>

      <UsernameField
        inputRef={usernameInputRef}
        nativeID="sign-up-username"
        value={username}
        onChangeText={setUsername}
        onSubmitEditing={onUsernameSubmitEditing}
      />

      <View className="gap-2">
        <Label nativeID="sign-up-email">Email</Label>
        <Input
          ref={emailInputRef}
          nativeID="sign-up-email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          onSubmitEditing={onEmailSubmitEditing}
          returnKeyType="next"
        />
      </View>

      <View className="gap-2">
        <Label nativeID="sign-up-password">Password</Label>
        <Input
          ref={passwordInputRef}
          nativeID="sign-up-password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="send"
          onSubmitEditing={onSubmit}
        />
      </View>

      <Button
        className="mt-1 h-auto min-h-14 w-full py-4 shadow-md shadow-black/10"
        size="lg"
        disabled={!canSubmit}
        onPress={onSubmit}>
        <Text className="text-base font-semibold text-primary-foreground">
          {isLoading ? 'Creating account...' : 'Continue'}
        </Text>
      </Button>

      <Pressable
        onPress={() => router.push('/sign-in')}
        className="items-center py-4 active:opacity-85">
        <Text className="text-center text-sm text-muted-foreground">
          {'Already have an account? '}
          <Text className="font-semibold text-foreground underline">Sign in</Text>
        </Text>
      </Pressable>
    </>
  );
}
