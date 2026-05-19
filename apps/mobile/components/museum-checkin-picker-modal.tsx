import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { XIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { SearchFieldRow } from '@/components/search-field-row';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type MuseumWithStats = {
  _id: Id<'museums'>;
  name: string;
  location?: { city?: string; state?: string; country?: string };
  distanceMeters?: number;
};

async function fetchViewerCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24,
    requiredAccuracy: 100_000,
  });
  if (lastKnown?.coords) {
    return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message = 'LOCATION_TIMEOUT'): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function locationSubtitle(museum: {
  location?: { city?: string; state?: string; country?: string };
}): string | null {
  const { city, state, country } = museum.location ?? {};
  const parts = [city, state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (country) return country;
  return null;
}

function formatDistance(distanceMeters: number | undefined): string | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return null;
  const miles = distanceMeters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function MuseumCheckinPickerModal({ visible, onClose }: Props) {
  const [search, setSearch] = useState('');

  type LocState =
    | { status: 'pending' }
    | { status: 'ok'; viewer: { latitude: number; longitude: number } }
    | { status: 'unavailable' };
  const [locState, setLocState] = useState<LocState>({ status: 'pending' });

  const resolveLocation = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocState({ status: 'unavailable' });
        return;
      }

      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') {
        setLocState({ status: 'unavailable' });
        return;
      }

      const viewer = await withTimeout(fetchViewerCoordinates(), 25_000);
      setLocState({ status: 'ok', viewer });
    } catch {
      setLocState({ status: 'unavailable' });
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      void resolveLocation();
    }
  }, [visible, resolveLocation]);

  const museums = useQuery(
    api.museums.listMuseumsWithStats,
    locState.status === 'ok' ? { viewer: locState.viewer } : {}
  );

  const filtered = useMemo(() => {
    if (!museums) return [];
    const q = search.trim().toLowerCase();
    let list: MuseumWithStats[] = !q
      ? [...museums]
      : museums.filter((m) => {
          const loc = locationSubtitle(m);
          return (
            m.name.toLowerCase().includes(q) ||
            (loc != null && loc.toLowerCase().includes(q))
          );
        });

    // Sort by distance if available, otherwise alphabetically
    list.sort((a, b) => {
      const aDist = a.distanceMeters;
      const bDist = b.distanceMeters;
      if (typeof aDist === 'number' && typeof bDist === 'number') {
        return aDist - bDist;
      }
      if (typeof aDist === 'number') return -1;
      if (typeof bDist === 'number') return 1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [museums, search]);

  const sortedByDistance = useMemo(() => {
    return filtered.length > 0 && typeof filtered[0].distanceMeters === 'number';
  }, [filtered]);

  const onPickMuseum = (museumId: Id<'museums'>) => {
    onClose();
    router.push({
      pathname: '/(museums)/[museumId]/checkin',
      params: { museumId },
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Dismiss museum picker"
        />
        <View className="z-10 max-h-[88%] rounded-t-2xl bg-background shadow-lg">
          <View className="border-b border-border px-5 pb-3 pt-3">
            <View className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-xl font-bold text-foreground">Check in</Text>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Close"
                onPress={onClose}
                className="shrink-0">
                <Icon as={XIcon} className="text-muted-foreground" size={22} />
              </Button>
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">
              {sortedByDistance
                ? 'Nearest museums first'
                : 'Choose a museum to log your visit.'}
            </Text>
          </View>

          <View className="px-5 pt-3">
            <SearchFieldRow
              value={search}
              onChangeText={setSearch}
              placeholder="Search museums..."
              className="mx-0 mb-3 mt-0"
            />
          </View>

          {museums === undefined ? (
            <View className="flex-1 items-center justify-center py-16">
              <BrandActivityIndicator size="large" />
              <Text variant="muted" className="mt-3 text-base">
                Loading museums...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="grow px-5 pb-7"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text className="py-8 text-center text-muted-foreground">
                  No museums match your search.
                </Text>
              }
              renderItem={({ item }) => {
                const sub = locationSubtitle(item);
                const dist = formatDistance(item.distanceMeters);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Check in at ${item.name}${dist ? `, ${dist} away` : ''}`}
                    onPress={() => onPickMuseum(item._id)}
                    className="mb-2 active:opacity-90">
                    <Card className="gap-0 border py-0 shadow-sm">
                      <CardContent className="gap-1 px-4 py-3.5">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="min-w-0 flex-1">
                            <CardTitle className="text-base font-semibold leading-snug">
                              {item.name}
                            </CardTitle>
                            {sub ? (
                              <CardDescription numberOfLines={2}>{sub}</CardDescription>
                            ) : null}
                          </View>
                          {dist ? (
                            <Text className="shrink-0 text-xs font-medium text-primary">
                              {dist}
                            </Text>
                          ) : null}
                        </View>
                      </CardContent>
                    </Card>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
