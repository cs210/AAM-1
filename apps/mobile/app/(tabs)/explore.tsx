import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';



export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  
  // Fetch museums with stats (average rating, rating count) from Convex
  const museums = useQuery(api.museums.listMuseumsWithStats);

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
        renderItem={({ item }) => <MuseumCard museum={item as MuseumCardData} />}
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