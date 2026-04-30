import React from 'react';
import {
  View,
  Image,
  ScrollView,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { CalendarIcon, Building2Icon, MapPinIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { AuthGuard } from '@/components/AuthGuard';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import {
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(startDate?: number, endDate?: number): string {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) return formatDate(startDate);
  if (endDate) return `Until ${formatDate(endDate)}`;
  return 'Date TBA';
}

function getFirstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default function ExhibitionDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ exhibitionId?: string | string[]; museumId?: string | string[] }>();

  const rawExhibitionId = getFirstParam(params.exhibitionId);
  const rawMuseumId = getFirstParam(params.museumId);

  const exhibitionId = React.useMemo(() => {
    if (!rawExhibitionId) return undefined;
    return rawExhibitionId.startsWith('exhibition-')
      ? rawExhibitionId.slice('exhibition-'.length)
      : rawExhibitionId;
  }, [rawExhibitionId]);

  const exhibition = useQuery(
    api.exhibitions.getPublicExhibition,
    exhibitionId ? { id: exhibitionId as Id<'exhibitions'> } : 'skip'
  );

  if (exhibition === undefined) {
    return (
      <AuthGuard>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
          <Stack.Screen options={{ headerShown: false }} />
          <View className="flex-1 items-center justify-center gap-3">
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="text-base">
              Loading exhibition...
            </Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  if (exhibition == null) {
    return (
      <AuthGuard>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
          <Stack.Screen options={{ headerShown: false }} />
          <View className="flex-1 items-center justify-center gap-4 p-6">
            <Text className="text-lg font-semibold text-foreground">Exhibition not found</Text>
            <Pressable className="rounded-xl bg-primary px-6 py-3 active:opacity-90" onPress={() => router.back()}>
              <Text className="text-base font-semibold text-primary-foreground">Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  const hostMuseum = exhibition.museum;
  const hostMuseumId = hostMuseum?._id ?? rawMuseumId;
  const dateLabel = formatDateRange(exhibition.startDate, exhibition.endDate);
  const hostLocation = hostMuseum?.location
    ? `${hostMuseum.location.city || ''}${hostMuseum.location.city && hostMuseum.location.state ? ', ' : ''}${hostMuseum.location.state || ''}`
    : '';

  const handleOpenMuseum = () => {
    if (!hostMuseumId) return;
    router.push(`/(museums)/${hostMuseumId}`);
  };

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScreenTitleBar title="Exhibition" onBackPress={() => router.back()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 36 + insets.bottom }}
        >
          <View className="mb-4 h-[220px] overflow-hidden rounded-2xl bg-muted">
            {exhibition.imageUrl ? (
              <Image source={{ uri: exhibition.imageUrl }} className="size-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center gap-2">
                <Building2Icon size={28} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                <Text variant="muted" className="text-sm">
                  No image available
                </Text>
              </View>
            )}
          </View>

          <View className="mb-4 gap-3 rounded-2xl border border-border bg-card p-5">
            <Text className="text-2xl font-bold text-foreground">{exhibition.name}</Text>

            <View className="flex-row items-center gap-2">
              <CalendarIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
              <Text className="flex-1 text-sm text-muted-foreground">{dateLabel}</Text>
            </View>

            {exhibition.description ? (
              <Text className="text-[15px] leading-[22px] text-foreground">{exhibition.description}</Text>
            ) : (
              <Text className="text-[15px] leading-[22px] text-muted-foreground">No description available.</Text>
            )}
          </View>

          <View className="gap-2.5 rounded-2xl border border-border bg-card p-5">
            <Text className="text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground">Hosted By</Text>
            <Text className="text-xl font-bold text-foreground">{hostMuseum?.name ?? 'Unknown museum'}</Text>
            {hostMuseum?.category ? (
              <Text className="self-start rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                {hostMuseum.category}
              </Text>
            ) : null}
            {hostLocation ? (
              <View className="flex-row items-center gap-2">
                <MapPinIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                <Text className="flex-1 text-sm text-muted-foreground">{hostLocation}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-1 items-center rounded-xl bg-primary py-3 active:opacity-90 disabled:bg-muted"
              onPress={handleOpenMuseum}
              disabled={!hostMuseumId}
            >
              <Text className="text-base font-semibold text-primary-foreground">View Museum</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}
