import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeftIcon,
  ScanSearchIcon,
  ExternalLinkIcon,
  ImageIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator as ExpoImageManipulator, SaveFormat } from 'expo-image-manipulator';
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

const DEFAULT_TOP_K = 5;
const MAX_SEARCH_IMAGE_SIZE = 1280;

type VisualSearchMuseum = {
  museumId: Id<'museums'>;
  museumName: string;
  museumSlug: string;
};

type VisualSearchResult = {
  artworkKey: string;
  objectId: string;
  title?: string | null;
  artistDisplayName?: string | null;
  description?: string | null;
  primaryImage?: string | null;
  primaryImageSmall?: string | null;
  imageUrlUsed?: string | null;
  sourceUrl?: string | null;
  score: number;
};

type VisualSearchResponse = {
  museumSlug: string;
  indexVersion: string;
  embeddingModel: string;
  topK: number;
  results: VisualSearchResult[];
};

type SearchStatus = 'uploading' | 'searching' | null;

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

function getUserFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/permission/i.test(message)) {
    return 'Photo library access is required to choose an image.';
  }
  if (/upload/i.test(message)) {
    return 'We could not upload the selected image. Please try again.';
  }
  if (/IMAGE_URL_UNAVAILABLE|Uploaded image URL/i.test(message)) {
    return 'We could not prepare the image for visual search. Please try again.';
  }
  if (/Visual search endpoint|visual search request|timed out|request failed/i.test(message)) {
    return 'Visual search is unavailable right now. Please try again later.';
  }

  return 'Visual search failed. Please try again.';
}

async function getProcessedImage(asset: ImagePicker.ImagePickerAsset) {
  const originalWidth = asset.width;
  const originalHeight = asset.height;

  if (!originalWidth || !originalHeight) {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }

  if (originalWidth <= MAX_SEARCH_IMAGE_SIZE && originalHeight <= MAX_SEARCH_IMAGE_SIZE) {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }

  const scale = Math.min(
    MAX_SEARCH_IMAGE_SIZE / originalWidth,
    MAX_SEARCH_IMAGE_SIZE / originalHeight
  );
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const context = ExpoImageManipulator.manipulate(asset.uri);
  context.resize({ width: targetWidth, height: targetHeight });

  const renderedImage = await context.renderAsync();
  const resizedImage = await renderedImage.saveAsync({
    compress: 0.85,
    format: SaveFormat.JPEG,
  });

  return { uri: resizedImage.uri, mimeType: 'image/jpeg' as const };
}

function formatScore(score: number) {
  return Number.isFinite(score) ? score.toFixed(3) : '0.000';
}

function getResultThumbnailUrl(result: VisualSearchResult) {
  return result.primaryImageSmall ?? result.primaryImage ?? result.imageUrlUsed ?? null;
}

function getResultDetailImageUrl(result: VisualSearchResult) {
  return result.primaryImage ?? result.primaryImageSmall ?? result.imageUrlUsed ?? null;
}

export default function VisualSearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    museumId?: string | string[];
    museumName?: string | string[];
    museumSlug?: string | string[];
  }>();
  const activeMuseums = useQuery(api.visualSearch.listVisualSearchActiveMuseums);
  const generateVisualSearchImageUploadUrl = useMutation(api.visualSearch.generateVisualSearchImageUploadUrl);
  const searchArtworkByImage = useAction(api.visualSearch.searchArtworkByImage);
  const [searchText, setSearchText] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<VisualSearchResponse | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

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
  const isWorking = searchStatus !== null;

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
    if (searchResponse) {
      setSearchResponse(null);
      setErrorMessage(null);
      setSelectedResultIndex(null);
      return;
    }

    if (selectedMuseum && !preselectedMuseum) {
      setSelectedMuseum(null);
      setSelectedImage(null);
      setErrorMessage(null);
      setSelectedResultIndex(null);
      return;
    }

    router.back();
  };

  const handleSelectMuseum = useCallback((museum: VisualSearchMuseum) => {
    setSelectedMuseum(museum);
    setSearchResponse(null);
    setErrorMessage(null);
    setSelectedResultIndex(null);
  }, []);

  const pickImage = async () => {
    if (isWorking) return;

    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Photo library access is required to choose an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        setErrorMessage('No image was selected.');
        return;
      }

      setSelectedImage(asset);
      setSearchResponse(null);
      setSelectedResultIndex(null);
    } catch (error) {
      console.error('Image selection failed:', error);
      setErrorMessage('Could not open your photo library. Please try again.');
    }
  };

  const uploadSelectedImage = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<Id<'_storage'>> => {
      const processedImage = await getProcessedImage(asset);
      const uploadUrl = await generateVisualSearchImageUploadUrl({});
      const fileResponse = await fetch(processedImage.uri);
      const fileBlob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': processedImage.mimeType,
        },
        body: fileBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Image upload failed.');
      }

      const body = (await uploadResponse.json()) as { storageId?: Id<'_storage'> };
      if (!body.storageId) {
        throw new Error('Image upload did not return a storage id.');
      }

      return body.storageId;
    },
    [generateVisualSearchImageUploadUrl]
  );

  const handleFindMatches = async () => {
    if (!selectedMuseum) return;

    if (!selectedImage) {
      setErrorMessage('Choose an image before searching.');
      return;
    }

    setErrorMessage(null);
    setSearchResponse(null);
    setSelectedResultIndex(null);
    setSearchStatus('uploading');

    try {
      const storageId = await uploadSelectedImage(selectedImage);

      setSearchStatus('searching');
      const response = await searchArtworkByImage({
        museumSlug: selectedMuseum.museumSlug,
        storageId,
        topK: DEFAULT_TOP_K,
      });

      setSearchResponse(response);
      if (response.results.length === 0) {
        setErrorMessage('No results returned for this image.');
      }
    } catch (error) {
      console.error('Visual search failed:', error);
      setErrorMessage(getUserFacingError(error));
    } finally {
      setSearchStatus(null);
    }
  };

  const handleTryAnotherImage = async () => {
    setSearchResponse(null);
    setErrorMessage(null);
    setSelectedResultIndex(null);
    await pickImage();
  };

  const renderMuseumItem = useCallback(
    ({ item }: { item: VisualSearchMuseum }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.museumName}`}
        className="mb-3 active:opacity-90"
        onPress={() => handleSelectMuseum(item)}>
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
    [handleSelectMuseum]
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

  const renderUploadStep = () => {
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
                Search this museum by image
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-5">
                {selectedMuseum.museumName}
              </CardDescription>
              <CardDescription className="mt-1 font-mono text-xs">
                {selectedMuseum.museumSlug}
              </CardDescription>
            </View>
          </CardHeader>
          <CardContent className="gap-5">
            <Text className="text-base leading-6 text-muted-foreground">
              Upload a clear photo of an artwork. We'll compare it against this museum's indexed collection.
            </Text>

            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                className="h-64 w-full rounded-2xl bg-muted"
                resizeMode="cover"
              />
            ) : (
              <View className="h-64 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
                <ImageIcon size={32} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                <Text className="mt-3 text-sm text-muted-foreground">No image selected</Text>
              </View>
            )}

            {errorMessage ? (
              <View className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <Text className="text-sm leading-5 text-destructive">{errorMessage}</Text>
              </View>
            ) : null}

            {searchStatus ? (
              <View className="flex-row items-center gap-2">
                <BrandActivityIndicator size="small" />
                <Text className="text-sm text-muted-foreground">
                  {searchStatus === 'uploading' ? 'Uploading image...' : 'Finding matches...'}
                </Text>
              </View>
            ) : null}

            {selectedImage ? (
              <View className="gap-3">
                <Button variant="outline" disabled={isWorking} onPress={pickImage}>
                  <Text>Replace Image</Text>
                </Button>
                <Button disabled={isWorking} onPress={handleFindMatches}>
                  {isWorking ? <BrandActivityIndicator size="small" /> : null}
                  <Text>Find Matches</Text>
                </Button>
              </View>
            ) : (
              <Button disabled={isWorking} onPress={pickImage}>
                <Text>Choose Image</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    );
  };

  const renderResults = () => {
    if (!selectedMuseum || !searchResponse) return null;
    const results = searchResponse.results;
    const backgroundUri =
      selectedImage?.uri ??
      (results[0] ? getResultDetailImageUrl(results[0]) : null);
    const selectedResult =
      selectedResultIndex == null ? null : results[selectedResultIndex] ?? null;

    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        {backgroundUri ? (
          <Image
            source={{ uri: backgroundUri }}
            className="absolute inset-0 size-full"
            resizeMode="contain"
          />
        ) : null}

        <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left', 'right']}>
          <View className="flex-row items-center justify-between px-4 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to image upload"
              className="size-11 items-center justify-center rounded-full border border-white/20 bg-black/45 active:opacity-80"
              onPress={handleBackPress}>
              <ArrowLeftIcon size={24} color="#ffffff" />
            </Pressable>
            <View className="ml-3 min-w-0 flex-1 items-end">
              <View className="max-w-full rounded-full border border-white/15 bg-black/45 px-3 py-2">
                <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                  {selectedMuseum.museumName}
                </Text>
              </View>
            </View>
          </View>

          {results.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Card className="w-full rounded-2xl border-white/20 bg-background/95 py-6">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-foreground">
                    No matches found
                  </CardTitle>
                  <CardDescription className="mt-2 text-center text-base leading-6">
                    Try a clearer image or another museum.
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-3">
                  <Button onPress={handleTryAnotherImage}>
                    <Text>Try another image</Text>
                  </Button>
                  <Button variant="outline" onPress={handleBackPress}>
                    <Text>Back</Text>
                  </Button>
                </CardContent>
              </Card>
            </View>
          ) : null}
        </SafeAreaView>

        {results.length > 0 ? (
          <View
            className="absolute left-0 right-0"
            style={{ bottom: Math.max(insets.bottom, 12) }}>
            <View className="mx-4 rounded-3xl border border-white/15 bg-black/50 py-3 shadow-lg shadow-black/40">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <Text className="text-xs font-semibold uppercase text-white/80">
                  Top Matches
                </Text>
                <Text className="text-xs text-white/65">
                  {results.length} found
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 14 }}>
                {results.map((result, index) => {
                  const thumbnailUrl = getResultThumbnailUrl(result);

                  return (
                    <Pressable
                      key={`${result.artworkKey || result.objectId || index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open match ${index + 1}`}
                      className="h-24 w-20 overflow-hidden rounded-2xl border border-white/30 bg-black/40 active:opacity-85"
                      onPress={() => setSelectedResultIndex(index)}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          className="absolute inset-0 size-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="absolute inset-0 items-center justify-center bg-muted">
                          <ImageIcon size={24} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                        </View>
                      )}
                      <View className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                        <Text className="text-[10px] font-semibold text-white">
                          Score {formatScore(result.score)}
                        </Text>
                      </View>
                      <View className="absolute left-1.5 top-1.5 size-6 items-center justify-center rounded-full bg-white">
                        <Text className="text-xs font-bold text-foreground">{index + 1}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}

        <Modal
          visible={selectedResult != null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedResultIndex(null)}>
          <Pressable
            className="flex-1 items-center justify-center bg-black/65 p-5"
            onPress={() => setSelectedResultIndex(null)}>
            {selectedResult ? (
              <Pressable
                className="max-h-[82%] w-full rounded-[28px] border border-white/15 bg-black/50 p-4 shadow-lg shadow-black/40"
                onPress={(event) => event.stopPropagation()}>
                <View className="mb-4 flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold uppercase text-white/70">
                    Match #{(selectedResultIndex ?? 0) + 1}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close match details"
                    className="size-9 items-center justify-center rounded-full bg-white/15 active:opacity-80"
                    onPress={() => setSelectedResultIndex(null)}>
                    <XIcon size={18} color="#ffffff" />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {getResultDetailImageUrl(selectedResult) ? (
                    <Image
                      source={{ uri: getResultDetailImageUrl(selectedResult)! }}
                      className="mb-5 h-56 w-full rounded-2xl bg-black/40"
                      resizeMode="contain"
                    />
                  ) : null}

                  <View className="gap-3">
                    <View>
                      <Text className="text-2xl font-semibold leading-8 text-white">
                        {selectedResult.title || 'Untitled'}
                      </Text>
                      <Text className="mt-1 text-base text-white/70">
                        {selectedResult.artistDisplayName || 'Unknown artist'}
                      </Text>
                    </View>

                    <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
                      <Text className="text-xs font-semibold text-white">
                        Score {formatScore(selectedResult.score)}
                      </Text>
                    </View>

                    {selectedResult.description ? (
                      <Text className="text-sm leading-6 text-white/90">
                        {selectedResult.description}
                      </Text>
                    ) : null}

                    {(selectedResult.objectId || selectedResult.artworkKey) ? (
                      <View className="gap-1 rounded-2xl bg-white/10 p-3">
                        {selectedResult.objectId ? (
                          <Text className="text-xs text-white/65">
                            Object ID: {selectedResult.objectId}
                          </Text>
                        ) : null}
                        {selectedResult.artworkKey ? (
                          <Text className="text-xs text-white/65">
                            Artwork key: {selectedResult.artworkKey}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {selectedResult.sourceUrl ? (
                      <Pressable
                        className="mt-1"
                        onPress={() => void Linking.openURL(selectedResult.sourceUrl!)}>
                        <View className="flex-row items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 active:opacity-80">
                          <ExternalLinkIcon size={16} color="#ffffff" />
                          <Text className="font-semibold text-white">Open source</Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                </ScrollView>
              </Pressable>
            ) : null}
          </Pressable>
        </Modal>
      </View>
    );
  };

  return (
    <AuthGuard>
      {searchResponse ? (
        renderResults()
      ) : (
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

          {selectedMuseum ? renderUploadStep() : renderMuseumSelector()}
        </SafeAreaView>
      )}
    </AuthGuard>
  );
}
