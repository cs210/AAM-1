import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/ui/button';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Text } from '@/components/ui/text';
import { isUsernameReadyForSubmit, UsernameField } from '@/components/username-field';
import { routeAfterUsernameSetup } from '@/lib/post-auth-routing';
import { getUsernameFormatError, normalizeUsernameInput } from '@/lib/username';
import { RN_API_MUTED_FOREGROUND_DARK, RN_API_MUTED_FOREGROUND_LIGHT } from '@/constants/rn-api-colors';
import { api } from '@packages/backend/convex/_generated/api';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { router } from 'expo-router';
import { AtSign, Ticket, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

function ReasonRow({
  icon: Icon,
  title,
  body,
  iconColor,
}: {
  icon: typeof AtSign;
  title: string;
  body: string;
  iconColor: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="bg-primary/10 mt-0.5 size-9 items-center justify-center rounded-full">
        <Icon size={18} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-sm leading-5">{body}</Text>
      </View>
    </View>
  );
}

export default function UsernameSetupScreen() {
  const { theme } = useUniwind();
  const mutedIcon = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : 'skip');
  const [username, setUsername] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [usernameAvailability, setUsernameAvailability] = React.useState<
    { available: boolean; reason?: string } | undefined
  >(undefined);
  const setUsernameMutation = useMutation(api.userProfiles.setUsername);
  const currentProfile = useQuery(
    api.userProfiles.getCurrentUserProfile,
    isAuthenticated ? undefined : 'skip'
  );
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, isAuthenticated ? {} : 'skip');

  const canSubmit =
    isUsernameReadyForSubmit(username, usernameAvailability) && !isSaving;

  const normalizedPreview = normalizeUsernameInput(username);
  const previewHandle =
    !getUsernameFormatError(username) && normalizedPreview.length >= 3
      ? `@${normalizedPreview}`
      : null;

  const firstName = React.useMemo(() => {
    const raw = currentUser?.name?.trim();
    if (!raw) return null;
    return raw.replace(/\s+\d+$/, '').split(/\s+/)[0] || null;
  }, [currentUser?.name]);

  React.useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isAuthLoading]);

  React.useEffect(() => {
    if (currentProfile === undefined || userInterests === undefined) return;
    if (currentProfile?.username) {
      routeAfterUsernameSetup(userInterests);
    }
  }, [currentProfile, userInterests]);

  async function onSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSaving(true);
    try {
      await setUsernameMutation({ username: normalizeUsernameInput(username) });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save username');
      setIsSaving(false);
    }
  }

  if (isAuthLoading || currentProfile === undefined) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <BrandActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-3 text-base">Loading your profile…</Text>
      </SafeAreaView>
    );
  }

  if (currentProfile?.username) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <BrandActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-3 text-base">Taking you in…</Text>
      </SafeAreaView>
    );
  }

  return (
    <AuthScreenLayout
      compact
      subtitle={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
      description="Your account needs a @username before you can use the app.">
      <View className="border-border bg-card gap-4 rounded-2xl border p-4">
        <Text className="text-foreground text-base font-semibold">Why am I seeing this?</Text>
        <Text className="text-muted-foreground text-sm leading-5">
          Museum& now uses a unique @username for every member. Your account was created before
          that was set up, so we need you to pick one now — it only takes a moment.
        </Text>
        <View className="gap-4 pt-1">
          <ReasonRow
            icon={Users}
            iconColor={mutedIcon}
            title="Friends can find you"
            body="People search by @username in Explore instead of guessing your email or display name."
          />
          <ReasonRow
            icon={Ticket}
            iconColor={mutedIcon}
            title="Tag visits together"
            body="When you check in to a museum, you can add friends by typing their @username."
          />
          <ReasonRow
            icon={AtSign}
            iconColor={mutedIcon}
            title="Your public handle"
            body="Your display name stays as-is. @username is the short link on your profile that never changes unless you edit it in Settings."
          />
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-foreground text-lg font-semibold">Choose your @username</Text>
      </View>

      {error ? (
        <View className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
          <Text className="text-center text-sm text-destructive">{error}</Text>
        </View>
      ) : null}

      <UsernameField
        value={username}
        onChangeText={setUsername}
        onAvailabilityChange={setUsernameAvailability}
        autoFocus
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      {previewHandle ? (
        <View className="bg-muted/40 rounded-xl px-4 py-3">
          <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Preview
          </Text>
          <Text className="text-foreground mt-1 text-lg font-semibold">{previewHandle}</Text>
        </View>
      ) : null}

      <Button
        className="h-auto min-h-14 w-full py-4 shadow-md shadow-black/10"
        size="lg"
        disabled={!canSubmit}
        onPress={onSubmit}>
        <Text className="text-base font-semibold text-primary-foreground">
          {isSaving ? 'Saving username…' : 'Save and continue'}
        </Text>
      </Button>
    </AuthScreenLayout>
  );
}
