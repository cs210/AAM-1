
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';
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
          <ActivityIndicator size="large" color="#D4915A" />
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
          <ActivityIndicator size="large" color="#D4915A" />
          <Text style={styles.loadingText}>Loading people...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={({ item }) => {
            // don't show the current user as a potential user
            // must consider the case where currUser is undefined (not logged in)
            if (currUser && item.userId === currUser._id) {
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

// --- Taste Aligned: posts from users who share your taste profile (compatibility matcher) ---
function TasteAlignedRoute({ compatibleCheckins, styles, currUserId }: { compatibleCheckins: CheckinPostData[] | undefined; styles: any; currUserId: string | null }) {
  if (compatibleCheckins === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4915A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  if (compatibleCheckins.length === 0) {
    return (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsText}>
          Follow museums to get a taste profile. Posts from taste-aligned people will show up here.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={compatibleCheckins}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <CheckinPost
            checkin={item}
            cardIndex={index}
            isOwnCheckin={currUserId != null && item.userId === currUserId}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default function SearchScreen() {
  const layout = useWindowDimensions();
  const params = useLocalSearchParams<{ search?: string | string[]; tab?: string | string[] }>();
  const [index, setIndex] = useState(0);
  const routes = React.useMemo(() => [
    { key: 'aligned', title: 'Taste Aligned' },
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
      setIndex(2);
    } else if (tabParam === 'museums') {
      setIndex(1);
    } else if (tabParam === 'aligned') {
      setIndex(0);
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
  const compatibleCheckins = useQuery(api.wrapped.getCompatibleCheckIns);
  const renderScene = React.useCallback(
    ({ route }: { route: { key: string } }) => {
      switch (route.key) {
        case 'aligned':
          return (
            <TasteAlignedRoute
              compatibleCheckins={compatibleCheckins}
              styles={styles}
              currUserId={currUser?._id ?? null}
            />
          );
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
    [museumSearch, setMuseumSearch, museums, filteredMuseums, peopleSearch, setPeopleSearch, users, filteredUsers, compatibleCheckins, currUser, styles]
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Top right bubble gradient */}
      <View style={styles.topRightBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      {/* Bottom left bubble gradient */}
      <View style={styles.bottomLeftBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(230, 210, 255, 0.1)', 'rgba(230, 210, 255, 0.4)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#D4915A', height: 2 }}
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
  topRightBubble: {
    position: 'absolute',
    top: -200,
    right: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bottomLeftBubble: {
    position: 'absolute',
    bottom: -200,
    left: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
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