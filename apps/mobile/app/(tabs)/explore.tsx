import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Doc } from '@packages/backend/convex/_generated/dataModel';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 150;

type Museum = Doc<"museums">;

const MuseumCard = ({ item }: { item: Museum }) => (
  <Pressable 
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    onPress={() => router.push(`/${item._id}`)}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.museumName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
    </View>
    <Text style={styles.museumLocation}>
      {item.location?.city || 'Unknown'}, {item.location?.state || ''}
    </Text>
    <View style={styles.detailsContainer}>
      <Text style={styles.detailText}>★ 4.5 Rating</Text>
      <Text style={styles.detailText}>📸 245 Photos</Text>
    </View>
  </Pressable>
);

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  
  // Fetch museums from Convex
  const museums = useQuery(api.museums.listMuseums);

  // Filter museums based on search text
  const filteredMuseums = useMemo(() => {
    if (!museums) return [];
    if (!searchText.trim()) return museums;
    
    const lowerSearch = searchText.toLowerCase();
    return museums.filter((museum) =>
      museum.name.toLowerCase().includes(lowerSearch) ||
      museum.location?.city?.toLowerCase().includes(lowerSearch) ||
      museum.location?.state?.toLowerCase().includes(lowerSearch)
    );
  }, [museums, searchText]);

  // Loading state
  if (museums === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Museums</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading museums...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (museums.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Museums</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No museums found</Text>
          <Text style={styles.emptySubtext}>Run the fake data script to populate museums</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Museums</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search museums..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#C7C7CC"
        />
      </View>

      <FlatList
        data={filteredMuseums}
        renderItem={({ item }) => <MuseumCard item={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        scrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No museums match your search</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#222',
    fontFamily: 'PublicSans',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontFamily: 'PublicSans',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardPressed: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  museumName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'PublicSans',
    flex: 1,
  },
  museumLocation: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'PublicSans',
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'PublicSans',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});