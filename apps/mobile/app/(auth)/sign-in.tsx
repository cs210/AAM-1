import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { AUTH_INPUT_CLASSNAME } from '@/lib/auth-ui';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

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
        <View className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
          <Text className="text-center text-sm text-destructive">{error}</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Label nativeID="sign-in-email">Email</Label>
        <Input
          nativeID="sign-in-email"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          onSubmitEditing={onEmailSubmitEditing}
          returnKeyType="next"
          className={AUTH_INPUT_CLASSNAME}
        />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="sign-in-password">Password</Label>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-2 py-1"
            onPress={() => router.push('/forgot-password')}>
            <Text>Forgot?</Text>
          </Button>
        </View>
        <Input
          ref={passwordInputRef}
          nativeID="sign-in-password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          className={AUTH_INPUT_CLASSNAME}
        />
      </View>

      <Button
        className="mt-1 h-auto min-h-14 w-full py-4 shadow-md shadow-black/10"
        size="lg"
        disabled={isLoading}
        onPress={onSubmit}>
        <Text className="text-base font-semibold text-primary-foreground">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </Button>

      <Pressable
        onPress={() => router.push('/sign-up')}
        className="items-center py-4 active:opacity-85">
        <Text className="text-center text-sm text-stone-600">
          {"Don't have an account? "}
          <Text className="font-semibold text-stone-900 underline">Sign up</Text>
        </Text>
      </Pressable>
    </AuthScreenLayout>
  );
}
