import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');

  function onSubmit() {
    // TODO: wire to Better Auth forgot-password / email flow when available
  }

  return (
    <>
      <View className="gap-2">
        <Label nativeID="forgot-email">Email</Label>
        <Input
          nativeID="forgot-email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          returnKeyType="send"
          onSubmitEditing={onSubmit}
        />
      </View>

      <Button
        className="mt-1 h-auto min-h-14 w-full py-4 shadow-md shadow-black/10"
        size="lg"
        onPress={onSubmit}>
        <Text className="text-base font-semibold text-primary-foreground">Send reset link</Text>
      </Button>

      <Pressable
        onPress={() => router.push('/sign-in')}
        className="items-center py-4 active:opacity-85">
        <Text className="text-center text-sm font-semibold text-foreground underline">
          Back to sign in
        </Text>
      </Pressable>
    </>
  );
}
