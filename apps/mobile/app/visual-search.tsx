import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { ArrowLeftIcon, ScanSearchIcon, SearchIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import type { Id } from '@packages/backend/convex/_generated/dataModel';
import { AuthGuard } from '@/components/AuthGuard';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  RN_API_FOREGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';

type VisualSearchMuseum = {
  museumId: Id<'museums'>;
  museumName: string;
  museumSlug: string;
};

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="size-10 items-center justify-center"
          onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color={RN_API_FOREGROUND_LIGHT} />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-foreground" numberOfLines={1}>
          Visual Search
        </Text>
        <View className="w-10" />
      </View>
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          Unable to load visual search.
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {error.message}
        </Text>
        <Button onPress={retry}>
          <Text>Try again</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function VisualSearchScreen() {
  const params = useLocalSearchParams<{
    museumId?: string | string[];
    museumName?: string | string[];
    museumSlug?: string | string[];
  }>();
  const activeMuseums = useQuery(api.visualSearch.listVisualSearchActiveMuseums);
  const [searchText, setSearchText] = useState('');

  const preselectedMuseum = useMemo<VisualSearchMuseum | null>(() => {
    const museumId = getParamValue(params.museumId);
    const museumName = getParamValue(params.museumName);
    const museumSlug = getParamValue(params.museumSlug);

    if (!museumId || !museumName || !museumSlug) return null;

    return {
      museumId: museumId as Id<'museums'>,
      museumName,
      museumSlug,
    };
  }, [params.museumId, params.museumName, params.museumSlug]);

  const [selectedMuseum, setSelectedMuseum] = useState<VisualSearchMuseum | null>(preselectedMuseum);

  useEffect(() => {
    if (preselectedMuseum) {
      setSelectedMuseum(preselectedMuseum);
    }
  }, [preselectedMuseum]);

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredMuseums = useMemo(() => {
    if (!activeMuseums) return [];
    if (!normalizedSearch) return activeMuseums;

    return activeMuseums.filter((museum) => {
      const museumName = museum.museumName.toLowerCase();
      const museumSlug = museum.museumSlug.toLowerCase();
      return museumName.includes(normalizedSearch) || museumSlug.includes(normalizedSearch);
    });
  }, [activeMuseums, normalizedSearch]);

  const handleBackPress = () => {
    if (selectedMuseum && !preselectedMuseum) {
      setSelectedMuseum(null);
      return;
    }

    router.back();
  };

  const renderMuseumItem = useCallback(
    ({ item }: { item: VisualSearchMuseum }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.museumName}`}
        className="mb-3 active:opacity-90"
        onPress={() => setSelectedMuseum(item)}>
        <Card className="gap-3 rounded-2xl py-4">
          <CardHeader className="gap-2 px-4">
            <View className="flex-row items-start gap-3">
              <View className="size-11 items-center justify-center rounded-full bg-primary/15">
                <ScanSearchIcon size={20} color={RN_API_PRIMARY_LIGHT} />
              </View>
              <View className="min-w-0 flex-1">
                <CardTitle className="text-lg leading-6 text-foreground" numberOfLines={2}>
                  {item.museumName}
                </CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">
                  {item.museumSlug}
                </CardDescription>
              </View>
            </View>
          </CardHeader>
        </Card>
      </Pressable>
    ),
    []
  );

  const renderMuseumSelector = () => (
    <FlatList
      className="flex-1 bg-background"
      data={filteredMuseums}
      keyExtractor={(item) => String(item.museumId)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      renderItem={renderMuseumItem}
      ListHeaderComponent={
        <View className="mb-5 gap-4">
          <View>
            <Text className="text-3xl font-semibold leading-tight text-foreground">
              Visual Search
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted-foreground">
              Choose a museum to search by image.
            </Text>
          </View>

          <View className="flex-row items-center rounded-xl border border-border bg-background px-3">
            <SearchIcon size={18} color={RN_API_MUTED_FOREGROUND_LIGHT} />
            <Input
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search museums"
              autoCapitalize="none"
              autoCorrect={false}
              className="h-11 flex-1 border-0 bg-transparent px-2 shadow-none"
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        activeMuseums === undefined ? (
          <View className="flex-1 items-center justify-center gap-3 py-12">
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="text-base">
              Loading visual search museums...
            </Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center rounded-2xl border border-border bg-card p-8">
            <Text className="text-center text-base font-semibold text-foreground">
              {normalizedSearch ? 'No museums match your search.' : 'No museums currently support visual search.'}
            </Text>
          </View>
        )
      }
    />
  );

  const renderUploadPlaceholder = () => {
    if (!selectedMuseum) return null;

    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Card className="gap-5 rounded-2xl py-6">
          <CardHeader className="gap-3">
            <View className="size-12 items-center justify-center rounded-full bg-primary/15">
              <ScanSearchIcon size={24} color={RN_API_PRIMARY_LIGHT} />
            </View>
            <View>
              <CardTitle className="text-2xl leading-8 text-foreground">
                {selectedMuseum.museumName}
              </CardTitle>
              <CardDescription className="mt-2 font-mono text-xs">
                {selectedMuseum.museumSlug}
              </CardDescription>
            </View>
          </CardHeader>
          <CardContent className="gap-5">
            <Text className="text-base leading-6 text-muted-foreground">
              Upload a photo of an artwork to find similar matches in this museum's collection.
            </Text>
            <Button disabled size="lg" className="w-full">
              <Text>Upload image — coming next</Text>
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    );
  };

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />

        <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="size-10 items-center justify-center"
            onPress={handleBackPress}>
            <ArrowLeftIcon size={24} color={RN_API_FOREGROUND_LIGHT} />
          </Pressable>
          <Text className="flex-1 text-center text-base font-semibold text-foreground" numberOfLines={1}>
            Visual Search
          </Text>
          <View className="w-10" />
        </View>

        {selectedMuseum ? renderUploadPlaceholder() : renderMuseumSelector()}
      </SafeAreaView>
    </AuthGuard>
  );
}
