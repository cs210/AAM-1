import { useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

export function SignUpForm() {
    const saveProfile = useMutation(api.auth.saveUserProfile);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

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
      // Upsert user profile immediately after sign-up
      try {
        await saveProfile({
          userId: data.user.id,
          name: data.user.name || undefined,
          email: data.user.email || undefined,
          imageUrl: data.user.image || undefined,
        });
      } catch (err) {
        console.error('Failed to save user profile:', err);
        setError('Failed to save user profile. Please try again.');
        return;
      }
      router.replace('/');
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please fill in the details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            {error ? (
              <View className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            ) : null}
            <View className="gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
            </View>
            <Button className="w-full" onPress={onSubmit} disabled={isLoading}>
              <Text>{isLoading ? 'Creating account...' : 'Continue'}</Text>
            </Button>
          </View>

          <Pressable
            onPress={() => {
              router.push('/sign-in');
            }}>
            <Text className="text-sm underline underline-offset-4 text-center">Already have an account? <Text className="text-sm underline underline-offset-4">Sign in</Text></Text>
          </Pressable>
          {/*
          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground px-4 text-sm">or</Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
          */}
        </CardContent>
      </Card>
    </View>
  );
}
