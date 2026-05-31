import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { getUsernameFormatError, normalizeUsernameInput } from '@/lib/username';
import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as React from 'react';
import { View } from 'react-native';

type UsernameFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  nativeID?: string;
  autoFocus?: boolean;
  returnKeyType?: 'next' | 'done' | 'send';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<React.ComponentRef<typeof Input> | null>;
};

export function UsernameField({
  value,
  onChangeText,
  label = 'Username',
  nativeID = 'username',
  autoFocus,
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}: UsernameFieldProps) {
  const formatError = getUsernameFormatError(value);
  const [debouncedUsername, setDebouncedUsername] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(normalizeUsernameInput(value));
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const availability = useQuery(
    api.userProfiles.isUsernameAvailable,
    debouncedUsername.length >= 3 && !formatError ? { username: debouncedUsername } : 'skip'
  );

  const availabilityMessage = React.useMemo(() => {
    if (!value.trim()) return null;
    if (formatError) return formatError;
    if (debouncedUsername !== normalizeUsernameInput(value)) return null;
    if (availability === undefined) return 'Checking availability…';
    if (availability.available) return 'Username is available';
    return availability.reason ?? 'Username is not available';
  }, [availability, debouncedUsername, formatError, value]);

  const availabilityTone = React.useMemo(() => {
    if (!availabilityMessage || formatError) return 'destructive' as const;
    if (availability === undefined) return 'muted' as const;
    if (availability?.available) return 'success' as const;
    return 'destructive' as const;
  }, [availability, availabilityMessage, formatError]);

  return (
    <View className="gap-2">
      <Label nativeID={nativeID}>{label}</Label>
      <View className="relative">
        <Text className="text-muted-foreground absolute top-1/2 left-3 z-10 -translate-y-1/2 text-base">
          @
        </Text>
        <Input
          ref={inputRef}
          nativeID={nativeID}
          placeholder="yourname"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          className="pl-8"
        />
      </View>
      {availabilityMessage ? (
        <Text
          className={
            availabilityTone === 'success'
              ? 'text-sm text-green-600 dark:text-green-400'
              : availabilityTone === 'destructive'
                ? 'text-destructive text-sm'
                : 'text-muted-foreground text-sm'
          }>
          {availabilityMessage}
        </Text>
      ) : (
        <Text className="text-muted-foreground text-sm">
          3–30 characters. Letters, numbers, and underscores only.
        </Text>
      )}
    </View>
  );
}

export function isUsernameReadyForSubmit(
  value: string,
  availability: { available: boolean; reason?: string } | undefined
): boolean {
  const formatError = getUsernameFormatError(value);
  if (formatError) return false;
  if (!value.trim()) return false;
  return availability?.available === true;
}
