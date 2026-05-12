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
import { SearchIcon, XIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { useUniwind } from 'uniwind';
import {
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';

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
  const { theme } = useUniwind();
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;

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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
                onPress={onClose}
                className="p-2 active:opacity-70">
                <XIcon size={22} color={mutedHex} />
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">Choose a museum to log your visit.</Text>
          </View>

          <View className="px-5 pt-3">
            <View className="mb-3 flex-row items-center rounded-xl bg-muted px-3 py-2.5">
              <SearchIcon size={18} color={mutedHex} />
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search museums..."
                autoCapitalize="none"
                autoCorrect={false}
                className="ml-2 flex-1 border-0 bg-transparent py-0 text-base text-foreground shadow-none"
              />
            </View>
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
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
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
                    className="mb-2 rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-90">
                    <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                    {sub ? (
                      <Text className="mt-0.5 text-sm text-muted-foreground">{sub}</Text>
                    ) : null}
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
