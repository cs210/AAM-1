import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { ArrowLeftIcon, CalendarIcon, Building2Icon, MapPinIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { AuthGuard } from '@/components/AuthGuard';

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
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4915A" />
            <Text style={styles.loadingText}>Loading exhibition...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  if (exhibition == null) {
    return (
      <AuthGuard>
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Exhibition not found</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryButtonText}>Go Back</Text>
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
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable style={styles.backIcon} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>Exhibition</Text>
          <View style={styles.backIcon} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroContainer}>
            {exhibition.imageUrl ? (
              <Image source={{ uri: exhibition.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Building2Icon size={28} color="#B3B3B3" />
                <Text style={styles.heroPlaceholderText}>No image available</Text>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.exhibitionTitle}>{exhibition.name}</Text>

            <View style={styles.metaRow}>
              <CalendarIcon size={16} color="#8E8E93" />
              <Text style={styles.metaText}>{dateLabel}</Text>
            </View>

            {exhibition.description ? (
              <Text style={styles.description}>{exhibition.description}</Text>
            ) : (
              <Text style={styles.descriptionMuted}>No description available.</Text>
            )}
          </View>

          <View style={styles.hostCard}>
            <Text style={styles.hostTitle}>Hosted By</Text>
            <Text style={styles.hostMuseumName}>{hostMuseum?.name ?? 'Unknown museum'}</Text>
            {hostMuseum?.category ? (
              <Text style={styles.hostMuseumCategory}>{hostMuseum.category}</Text>
            ) : null}
            {hostLocation ? (
              <View style={styles.metaRow}>
                <MapPinIcon size={16} color="#8E8E93" />
                <Text style={styles.metaText}>{hostLocation}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                !hostMuseumId && styles.primaryButtonDisabled,
                pressed && hostMuseumId && styles.primaryButtonPressed,
              ]}
              onPress={handleOpenMuseum}
              disabled={!hostMuseumId}
            >
              <Text style={styles.primaryButtonText}>View Museum</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 36,
  },
  heroContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroPlaceholderText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailCard: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  exhibitionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  descriptionMuted: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8E8E93',
  },
  hostCard: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  hostTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#8E8E93',
    fontWeight: '700',
  },
  hostMuseumName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  hostMuseumCategory: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 145, 90, 0.15)',
    color: '#D4915A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#D4915A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    backgroundColor: '#DDD',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
