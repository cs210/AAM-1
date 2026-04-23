import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

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
        disabled={isLoading}
        onPress={onSubmit}>
        <Text className="text-base font-semibold text-primary-foreground">
          {isLoading ? 'Creating account...' : 'Continue'}
        </Text>
      </Button>

      <Pressable
        onPress={() => router.push('/sign-in')}
        className="items-center py-4 active:opacity-85">
        <Text className="text-center text-sm text-stone-600">
          {'Already have an account? '}
          <Text className="font-semibold text-stone-900 underline">Sign in</Text>
        </Text>
      </Pressable>
    </>
  );
}
