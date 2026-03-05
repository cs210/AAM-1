
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';
import { router, useLocalSearchParams } from 'expo-router';
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
          <ActivityIndicator size="large" color="#A67C52" />
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

function PeopleRoute({ peopleSearch, setPeopleSearch, users, filteredUsers, styles, currUser }: any) {
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
          <ActivityIndicator size="large" color="#A67C52" />
          <Text style={styles.loadingText}>Loading people...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={({ item }) => {
            // don't show the current user as a potential user
            if (item.userId == currUser._id) {
              return (<></>);
            }
            const rawName = item.name || item.email || '';
            const displayName = typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
            return (
              <Pressable
                style={styles.userCard}
                onPress={() => router.push(`/(tabs)/profile?userId=${encodeURIComponent(item.userId)}&search=${encodeURIComponent(peopleSearch)}`)}
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
  const params = useLocalSearchParams<{ search?: string | string[]; tab?: string | string[] }>();
  const [index, setIndex] = useState(0);
  const routes = React.useMemo(() => [
    { key: 'museums', title: 'Museums' },
    { key: 'people', title: 'People' },
  ], []);

  // People tab state (restore from URL when returning from profile)
  const [peopleSearch, setPeopleSearch] = useState('');
  React.useEffect(() => {
    const searchParam = Array.isArray(params.search) ? params.search[0] : params.search;
    const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (typeof searchParam === 'string' && searchParam !== '') {
      setPeopleSearch(searchParam);
    }
    if (tabParam === 'people') {
      setIndex(1);
    }
  }, [params.search, params.tab]);

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
  const currUser = useQuery(api.auth.getCurrentUser);
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
              currUser={currUser}
            />
          );
        default:
          return null;
      }
    },
    [museumSearch, setMuseumSearch, museums, filteredMuseums, peopleSearch, setPeopleSearch, users, filteredUsers, styles]
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#A67C52', height: 2 }}
            style={{ backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, marginTop: 0 }}
            activeColor="#1A1A1A"
            inactiveColor="#999"
            labelStyle={{ fontSize: 16, fontWeight: '500', textTransform: 'none' }}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  listContainer: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 48,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});