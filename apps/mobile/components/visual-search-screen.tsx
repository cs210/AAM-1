import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeftIcon,
  CameraIcon,
  ScanSearchIcon,
  LandmarkIcon,
  ExternalLinkIcon,
  ImageIcon,
  SearchIcon,
  InfoIcon,
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
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { RN_API_PRIMARY_FOREGROUND_ON_BRAND, RN_STYLE } from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';
import { dismissFeatureHint, shouldShowFeatureHint } from '@/lib/feature-hints';

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
    <SafeAreaView className="bg-background flex-1" style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenTitleBar title="Visual Search" onBackPress={() => router.back()} />
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text className="text-foreground text-center text-lg font-semibold">
          Unable to load visual search.
        </Text>
        <Text className="text-muted-foreground text-center text-sm leading-5">{error.message}</Text>
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
    return 'Photo or camera access is required to choose an image.';
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
  const { theme } = useUniwind();
  const palette = theme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;
  const params = useLocalSearchParams<{
    museumId?: string | string[];
    museumName?: string | string[];
    museumSlug?: string | string[];
  }>();
  const activeMuseums = useQuery(api.visualSearch.listVisualSearchActiveMuseums);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const generateVisualSearchImageUploadUrl = useMutation(
    api.visualSearch.generateVisualSearchImageUploadUrl
  );
  const searchArtworkByImage = useAction(api.visualSearch.searchArtworkByImage);
  const [searchText, setSearchText] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<VisualSearchResponse | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [showVisualSearchHint, setShowVisualSearchHint] = useState(false);

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

  const [selectedMuseum, setSelectedMuseum] = useState<VisualSearchMuseum | null>(
    preselectedMuseum
  );
  const isWorking = searchStatus !== null;
  const foregroundIconColor = palette.foreground;
  const mutedIconColor = palette.mutedForeground;
  const primaryIconColor = palette.primary;

  useEffect(() => {
    if (preselectedMuseum) {
      setSelectedMuseum(preselectedMuseum);
    }
  }, [preselectedMuseum]);

  useEffect(() => {
    const userId = currentUser?._id;
    if (!userId) return;
    let isActive = true;

    const run = async () => {
      try {
        const shouldShow = await shouldShowFeatureHint(userId, 'visual_search_intro');
        if (!isActive) return;
        setShowVisualSearchHint(shouldShow);
      } catch {
        if (!isActive) return;
        setShowVisualSearchHint(false);
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [currentUser?._id]);

  const dismissVisualSearchHint = useCallback(async () => {
    const userId = currentUser?._id;
    if (!userId) return;
    setShowVisualSearchHint(false);
    try {
      await dismissFeatureHint(userId, 'visual_search_intro');
    } catch {
      // Non-blocking persistence failure.
    }
  }, [currentUser?._id]);

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

  const setSearchImage = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setSelectedImage(asset);
    setSearchResponse(null);
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

      setSearchImage(asset);
    } catch (error) {
      console.error('Image selection failed:', error);
      setErrorMessage('Could not open your photo library. Please try again.');
    }
  };

  const takePhoto = async () => {
    if (isWorking) return;

    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Camera access is required to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        setErrorMessage('No photo was captured.');
        return;
      }

      setSearchImage(asset);
    } catch (error) {
      console.error('Camera capture failed:', error);
      setErrorMessage('Could not open the camera. Please try again.');
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

  const handleTryAnotherImage = () => {
    setSearchResponse(null);
    setErrorMessage(null);
    setSelectedResultIndex(null);
    setSelectedImage(null);
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
            <View className="flex-row items-center gap-3">
              <View className="bg-primary/15 size-11 items-center justify-center rounded-full">
                <LandmarkIcon size={20} color={primaryIconColor} />
              </View>
              <View className="min-w-0 flex-1 justify-center">
                <CardTitle className="text-foreground text-lg leading-6" numberOfLines={2}>
                  {item.museumName}
                </CardTitle>
              </View>
            </View>
          </CardHeader>
        </Card>
      </Pressable>
    ),
    [handleSelectMuseum, primaryIconColor]
  );

  const renderMuseumSelector = () => (
    <FlatList
      className="bg-background flex-1"
      data={filteredMuseums}
      keyExtractor={(item) => String(item.museumId)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      renderItem={renderMuseumItem}
      ListHeaderComponent={
        <View className="mb-5 gap-4">
          <View>
            <View className="flex-row items-center gap-3">
              <View className="bg-primary/15 size-12 items-center justify-center rounded-full">
                <ScanSearchIcon size={24} color={primaryIconColor} />
              </View>
              <View className="min-w-0 flex-1 justify-center">
                <CardTitle className="text-foreground text-3xl leading-tight font-semibold">
                  Visual Search
                </CardTitle>
              </View>
            </View>
          </View>
          {showVisualSearchHint ? (
              <View className="border-primary/50 bg-primary/10 rounded-xl border p-3">
                <View className="flex-row items-start gap-2">
                  <View className="mt-0.5">
                    <InfoIcon size={14} color={primaryIconColor} />
                  </View>
                  <Text className="flex-1 text-xs leading-5 text-foreground">
                    Upload or take a photo to find matching artwork from museum collections.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss visual search hint"
                    onPress={dismissVisualSearchHint}
                    className="px-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

          <View className="border-border bg-background flex-row items-center rounded-xl border px-3">
            <SearchIcon size={18} color={mutedIconColor} />
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
          <View className="border-border bg-card flex-1 items-center justify-center rounded-2xl border p-8">
            <Text className="text-foreground text-center text-base font-semibold">
              {normalizedSearch
                ? 'No museums match your search.'
                : 'No museums currently support visual search.'}
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
        className="bg-background flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Card className="gap-5 rounded-2xl py-6">
          <CardHeader className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="bg-primary/15 size-12 items-center justify-center rounded-full">
                <ScanSearchIcon size={24} color={primaryIconColor} />
              </View>
              <View className="min-w-0 flex-1 justify-center">
                <CardTitle className="text-foreground text-2xl leading-8">
                  {selectedMuseum.museumName}
                </CardTitle>
              </View>
            </View>
          </CardHeader>
          <CardContent className="gap-5">
            <Text className="text-muted-foreground text-base leading-6">
              Take or choose a clear photo of an artwork. We'll compare it against this museum's
              indexed collection.
            </Text>

            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                className="bg-muted h-64 w-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="border-border bg-muted/40 h-64 w-full items-center justify-center rounded-2xl border border-dashed">
                <ImageIcon size={32} color={mutedIconColor} />
                <Text className="text-muted-foreground mt-3 text-sm">No image selected</Text>
              </View>
            )}

            {errorMessage ? (
              <View className="border-destructive/30 bg-destructive/10 rounded-xl border p-3">
                <Text className="text-destructive text-sm leading-5">{errorMessage}</Text>
              </View>
            ) : null}

            {searchStatus ? (
              <View className="flex-row items-center gap-2">
                <BrandActivityIndicator size="small" />
                <Text className="text-muted-foreground text-sm">
                  {searchStatus === 'uploading' ? 'Uploading image...' : 'Finding matches...'}
                </Text>
              </View>
            ) : null}

            {selectedImage ? (
              <View className="gap-3">
                <Button variant="outline" disabled={isWorking} onPress={takePhoto}>
                  <CameraIcon size={16} color={foregroundIconColor} />
                  <Text>Take New Photo</Text>
                </Button>
                <Button variant="outline" disabled={isWorking} onPress={pickImage}>
                  <ImageIcon size={16} color={foregroundIconColor} />
                  <Text>Choose Different Image</Text>
                </Button>
                <Button disabled={isWorking} onPress={handleFindMatches}>
                  {isWorking ? <BrandActivityIndicator size="small" /> : null}
                  <Text>Find Matches</Text>
                </Button>
              </View>
            ) : (
              <View className="gap-3">
                <Button disabled={isWorking} onPress={takePhoto}>
                  <CameraIcon size={16} color={RN_API_PRIMARY_FOREGROUND_ON_BRAND} />
                  <Text>Take Photo</Text>
                </Button>
                <Button variant="outline" disabled={isWorking} onPress={pickImage}>
                  <ImageIcon size={16} color={foregroundIconColor} />
                  <Text>Choose from Library</Text>
                </Button>
              </View>
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
      selectedImage?.uri ?? (results[0] ? getResultDetailImageUrl(results[0]) : null);
    const selectedResult =
      selectedResultIndex == null ? null : (results[selectedResultIndex] ?? null);

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
              className="border-border bg-card/90 size-11 items-center justify-center rounded-full border active:opacity-80"
              onPress={handleBackPress}>
              <ArrowLeftIcon size={24} color={foregroundIconColor} />
            </Pressable>
            <View className="ml-3 min-w-0 flex-1 items-end">
              <View className="border-border bg-card/90 max-w-full rounded-full border px-3 py-2">
                <Text className="text-foreground text-xs font-semibold" numberOfLines={1}>
                  {selectedMuseum.museumName}
                </Text>
              </View>
            </View>
          </View>

          {results.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Card className="border-border bg-card/95 w-full rounded-2xl py-6">
                <CardHeader>
                  <CardTitle className="text-foreground text-center text-2xl">
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
          <View className="absolute right-0 left-0" style={{ bottom: Math.max(insets.bottom, 12) }}>
            <View className="border-border bg-card/95 mx-4 rounded-3xl border py-3 shadow-lg shadow-black/20">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <Text className="text-muted-foreground text-xs font-semibold uppercase">
                  Top Matches
                </Text>
                <Text className="text-muted-foreground text-xs">{results.length} found</Text>
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
                      className="border-border bg-muted h-24 w-20 overflow-hidden rounded-2xl border active:opacity-85"
                      onPress={() => setSelectedResultIndex(index)}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          className="absolute inset-0 size-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="bg-muted absolute inset-0 items-center justify-center">
                          <ImageIcon size={24} color={mutedIconColor} />
                        </View>
                      )}
                      <View className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                        <Text className="text-[10px] font-semibold text-white">
                          Score {formatScore(result.score)}
                        </Text>
                      </View>
                      <View className="bg-primary absolute top-1.5 left-1.5 size-6 items-center justify-center rounded-full">
                        <Text className="text-primary-foreground text-xs font-bold">
                          {index + 1}
                        </Text>
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
                className="border-border bg-card max-h-[82%] w-full rounded-[28px] border p-4 shadow-lg shadow-black/30"
                onPress={(event) => event.stopPropagation()}>
                <View className="mb-4 flex-row items-center justify-between gap-3">
                  <Text className="text-muted-foreground text-sm font-semibold uppercase">
                    Match #{(selectedResultIndex ?? 0) + 1}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close match details"
                    className="bg-muted size-9 items-center justify-center rounded-full active:opacity-80"
                    onPress={() => setSelectedResultIndex(null)}>
                    <XIcon size={18} color={foregroundIconColor} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {getResultDetailImageUrl(selectedResult) ? (
                    <Image
                      source={{ uri: getResultDetailImageUrl(selectedResult)! }}
                      className="bg-muted mb-5 h-56 w-full rounded-2xl"
                      resizeMode="contain"
                    />
                  ) : null}

                  <View className="gap-3">
                    <View>
                      <Text className="text-foreground text-2xl leading-8 font-semibold">
                        {selectedResult.title || 'Untitled'}
                      </Text>
                      <Text className="text-muted-foreground mt-1 text-base">
                        {selectedResult.artistDisplayName || 'Unknown artist'}
                      </Text>
                    </View>

                    <View className="bg-primary/15 self-start rounded-full px-3 py-1.5">
                      <Text className="text-primary text-xs font-semibold">
                        Score {formatScore(selectedResult.score)}
                      </Text>
                    </View>

                    {selectedResult.description ? (
                      <Text className="text-foreground text-sm leading-6">
                        {selectedResult.description}
                      </Text>
                    ) : null}

                    {selectedResult.objectId || selectedResult.artworkKey ? (
                      <View className="bg-muted gap-1 rounded-2xl p-3">
                        {selectedResult.objectId ? (
                          <Text className="text-muted-foreground text-xs">
                            Object ID: {selectedResult.objectId}
                          </Text>
                        ) : null}
                        {selectedResult.artworkKey ? (
                          <Text className="text-muted-foreground text-xs">
                            Artwork key: {selectedResult.artworkKey}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {selectedResult.sourceUrl ? (
                      <Pressable
                        className="mt-1"
                        onPress={() => void Linking.openURL(selectedResult.sourceUrl!)}>
                        <View className="border-border bg-muted flex-row items-center justify-center gap-2 rounded-full border px-4 py-3 active:opacity-80">
                          <ExternalLinkIcon size={16} color={foregroundIconColor} />
                          <Text className="text-foreground font-semibold">Open source</Text>
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
        <SafeAreaView className="bg-background flex-1" style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />

          <ScreenTitleBar title="Visual Search" onBackPress={handleBackPress} />

          {selectedMuseum ? renderUploadStep() : renderMuseumSelector()}
        </SafeAreaView>
      )}
    </AuthGuard>
  );
}
