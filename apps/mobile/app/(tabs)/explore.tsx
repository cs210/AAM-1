
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';
import { router } from 'expo-router';
import { TabView, TabBar } from 'react-native-tab-view';



// --- Tab Scenes defined outside main component for stability ---
function MuseumsRoute({ museumSearch, setMuseumSearch, museums, filteredMuseums, styles }: any) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search museums..."
          value={museumSearch}
          onChangeText={setMuseumSearch}
          placeholderTextColor="#C7C7CC"
        />
      </View>
      {museums === undefined ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading museums...</Text>
        </View>
      ) : (
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
      )}
    </View>
  );
}

function PeopleRoute({ peopleSearch, setPeopleSearch, users, filteredUsers, styles }: any) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          value={peopleSearch}
          onChangeText={setPeopleSearch}
          placeholderTextColor="#C7C7CC"
        />
      </View>
      {users === undefined ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading people...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={({ item }) => {
            const rawName = item.name || item.email || '';
            const displayName = typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
            return (
              <Pressable
                style={styles.userCard}
                onPress={() => router.push(`/(tabs)/profile?userId=${encodeURIComponent(item.userId)}`)}
              >
                <Text style={styles.userName} numberOfLines={1}>{displayName || "Name can't be displayed"}</Text>
              </Pressable>
            );
          }}
          keyExtractor={(item) => item.userId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {peopleSearch.trim() ? 'No people match your search' : 'Search for people to find accounts'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

export default function SearchScreen() {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const routes = React.useMemo(() => [
    { key: 'museums', title: 'Museums' },
    { key: 'people', title: 'People' },
  ], []);

  // Museums tab state
  const [museumSearch, setMuseumSearch] = useState('');
  const museums = useQuery(api.museums.listMuseumsWithStats);
  const filteredMuseums = useMemo(() => {
    if (!museums) return [];
    if (!museumSearch.trim()) return museums;
    const lowerSearch = museumSearch.toLowerCase();
    return museums.filter((museum) =>
      museum.name.toLowerCase().includes(lowerSearch) ||
      museum.location?.city?.toLowerCase().includes(lowerSearch) ||
      museum.location?.state?.toLowerCase().includes(lowerSearch)
    );
  }, [museums, museumSearch]);

  // People tab state
  const [peopleSearch, setPeopleSearch] = useState('');
  const users = useQuery(api.auth.listUsers);
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!peopleSearch.trim()) return []; // Only show accounts when user has searched
    const lowerSearch = peopleSearch.toLowerCase();
    return users.filter((user: any) =>
      user.name?.toLowerCase().includes(lowerSearch) ||
      user.email?.toLowerCase().includes(lowerSearch)
    );
  }, [users, peopleSearch]);

  // renderScene directly returns the route components with current props
  const renderScene = React.useCallback(
    ({ route }: { route: { key: string } }) => {
      switch (route.key) {
        case 'museums':
          return (
            <MuseumsRoute
              museumSearch={museumSearch}
              setMuseumSearch={setMuseumSearch}
              museums={museums}
              filteredMuseums={filteredMuseums}
              styles={styles}
            />
          );
        case 'people':
          return (
            <PeopleRoute
              peopleSearch={peopleSearch}
              setPeopleSearch={setPeopleSearch}
              users={users}
              filteredUsers={filteredUsers}
              styles={styles}
            />
          );
        default:
          return null;
      }
    },
    [museumSearch, setMuseumSearch, museums, filteredMuseums, peopleSearch, setPeopleSearch, users, filteredUsers, styles]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#007AFF' }}
            style={{ backgroundColor: '#fff' }}
            activeColor="#007AFF"
            inactiveColor="#888"
          />
        )}
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
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eee',
    marginHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 4,
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