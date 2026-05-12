import React, { useEffect, useMemo, useState } from 'react';
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

function locationSubtitle(museum: {
  location?: { city?: string; state?: string; country?: string };
}): string | null {
  const { city, state, country } = museum.location ?? {};
  const parts = [city, state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (country) return country;
  return null;
}

export function MuseumCheckinPickerModal({ visible, onClose }: Props) {
  const [search, setSearch] = useState('');
  const museums = useQuery(api.museums.listMuseumsWithStats, {});

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!museums) return [];
    const q = search.trim().toLowerCase();
    const list = !q
      ? [...museums]
      : museums.filter((m) => {
          const loc = locationSubtitle(m);
          return (
            m.name.toLowerCase().includes(q) ||
            (loc != null && loc.toLowerCase().includes(q))
          );
        });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [museums, search]);

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
            <Text className="mt-1 text-sm text-muted-foreground">Choose a museum to log your visit.</Text>
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
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Check in at ${item.name}`}
                    onPress={() => onPickMuseum(item._id)}
                    className="mb-2 active:opacity-90">
                    <Card className="gap-0 border py-0 shadow-sm">
                      <CardContent className="gap-1 px-4 py-3.5">
                        <CardTitle className="text-base font-semibold leading-snug">{item.name}</CardTitle>
                        {sub ? (
                          <CardDescription numberOfLines={2}>{sub}</CardDescription>
                        ) : null}
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
