import React from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { EventCard, EventCardData } from '../../components/event-card';
import { useViewerLocation } from '@/hooks/useViewerLocation';

export default function NearbyEventsScreen() {
  const { locState, retry } = useViewerLocation();
  const nearbyFeed = useQuery(
    api.events.getNearbyFeed,
    locState.status === 'ok' ? { viewer: locState.viewer } : 'skip'
  );

  const loading =
    locState.status === 'pending' || (locState.status === 'ok' && nearbyFeed === undefined);

  return (
    <>
      <Stack.Screen options={{ title: 'Near you' }} />
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['bottom']}>
        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="text-base">
              Finding events near you...
            </Text>
          </View>
        ) : locState.status === 'unavailable' ? (
          <View className="flex-1 justify-center px-8">
            <Text className="text-center text-base text-muted-foreground">{locState.message}</Text>
            <View className="mt-6 flex-row justify-center gap-3">
              <Button onPress={retry}>
                <Text>Try again</Text>
              </Button>
              <Pressable
                onPress={() => Linking.openSettings()}
                className="border-border rounded-lg border px-4 py-2.5 active:opacity-90">
                <Text className="text-sm font-semibold">Settings</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            {nearbyFeed && nearbyFeed.length > 0 ? (
              nearbyFeed.map((event, index) => (
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
                  No upcoming events or exhibitions found near you right now.
                </Text>
                <Button className="mt-6" onPress={() => retry()}>
                  <Text>Refresh location</Text>
                </Button>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
