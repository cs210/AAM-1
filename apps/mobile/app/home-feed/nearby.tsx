import React, { useCallback } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InfoIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { EventCard, EventCardData } from '@/components/event-card';
import { MuseumCard, MuseumCardData } from '@/components/museum-card';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import { useSoftwareFairMode } from '@/lib/software-fair-mode';

function promptEnableLocation(message: string, onRetry: () => void) {
  Alert.alert('Turn on location', message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Try again', onPress: onRetry },
    { text: 'Settings', onPress: () => Linking.openSettings() },
  ]);
}

export default function NearbyEventsScreen() {
  const brandPrimary = useBrandPrimaryHex();
  const softwareFair = useSoftwareFairMode();
  const isSoftwareFairMode = softwareFair.isJoined;
  const { locState, retry } = useViewerLocation();
  const nearbyFeed = useQuery(
    api.events.getNearbyFeed,
    !isSoftwareFairMode && locState.status === 'ok' ? { viewer: locState.viewer } : 'skip'
  );
  const availableFeed = useQuery(
    api.events.getAvailableFeed,
    !isSoftwareFairMode && locState.status === 'unavailable' ? {} : 'skip'
  );
  const softwareFairBooths = useQuery(
    api.softwareFair.listActiveBoothMuseums,
    isSoftwareFairMode
      ? locState.status === 'ok'
        ? { viewer: locState.viewer }
        : {}
      : 'skip'
  );

  const feed =
    locState.status === 'ok' ? nearbyFeed : locState.status === 'unavailable' ? availableFeed : undefined;

  const loading =
    isSoftwareFairMode
      ? softwareFairBooths === undefined
      : locState.status === 'pending' ||
        (locState.status === 'ok' && nearbyFeed === undefined) ||
        (locState.status === 'unavailable' && availableFeed === undefined);

  const promptLocation = useCallback(() => {
    if (locState.status !== 'unavailable') return;
    promptEnableLocation(locState.message, retry);
  }, [locState, retry]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScreenTitleBar
          title={isSoftwareFairMode ? 'Software Fair Booths' : 'Visit Exhibitions and Events'}
          onBackPress={() => router.back()}
        />
        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="text-base">
              {isSoftwareFairMode
                ? 'Loading booths...'
                : locState.status === 'pending'
                  ? 'Finding events near you...'
                  : 'Loading events...'}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            {!isSoftwareFairMode && locState.status === 'unavailable' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="About location for nearby picks"
                onPress={promptLocation}
                className="border-border/60 bg-card/80 mb-4 flex-row items-center gap-2 rounded-2xl border px-4 py-3 active:opacity-90">
                <InfoIcon size={18} color={brandPrimary} />
                <Text className="flex-1 text-sm text-muted-foreground">
                  Turn on location to sort picks by what is nearest to you.
                </Text>
              </Pressable>
            ) : null}
            {isSoftwareFairMode ? (
              softwareFairBooths && softwareFairBooths.length > 0 ? (
                (softwareFairBooths as MuseumCardData[]).map((museum) => (
                  <MuseumCard key={museum._id} museum={museum} className="mx-0" />
                ))
              ) : (
                <View className="items-center px-4 py-16">
                  <Text className="text-center text-base text-muted-foreground">
                    No active Software Fair booths yet.
                  </Text>
                </View>
              )
            ) : feed && feed.length > 0 ? (
              feed.map((event, index) => (
                <EventCard
                  key={`${event.kind ?? 'event'}-${event._id}`}
                  event={event as EventCardData}
                  cardIndex={index}
                  layout="feed"
                />
              ))
            ) : (
              <View className="items-center px-4 py-16">
                <Text className="text-center text-base text-muted-foreground">
                  {locState.status === 'ok'
                    ? 'No upcoming events or exhibitions found near you right now.'
                    : 'No upcoming events or exhibitions right now.'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
