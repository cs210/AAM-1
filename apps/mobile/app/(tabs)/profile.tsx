

import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height;

const stats = [
  { title: 'You visited', value: '12 museums this year', icon: '🏛️' },
  { title: 'Cities explored', value: '5 cities through art', icon: '🌆' },
  { title: 'Artworks favorited', value: '34 artworks', icon: '❤️' },
  { title: 'Hours browsing', value: '18 hours', icon: '⏰' },
  { title: 'Most visited museum', value: 'Modern Art Gallery', icon: '🎨' },
  { title: 'Events attended', value: '3 events', icon: '🎟️' },
  { title: 'Artworks shared', value: '7 artworks', icon: '🔗' },
  { title: 'New artists discovered', value: '9 artists', icon: '🧑‍🎨' },
  { title: 'Reviews written', value: '4 reviews', icon: '✍️' },
  { title: 'Badges earned', value: '2 badges', icon: '🏅' },
];

const Pane = ({ item, index }: { item: typeof stats[0]; index: number }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  return (
    <Animated.View style={[styles.pane, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.value}>{item.value}</Text>
    </Animated.View>
  );
};


export default function WrappedScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  // When navigating from search, userId is in URL params; otherwise show current user's profile
  const paramUserIdStr = Array.isArray(paramUserId) ? paramUserId[0] : paramUserId;
  const viewedUserId = (typeof paramUserIdStr === 'string' && paramUserIdStr ? paramUserIdStr : null) || currentUserId;

  // Fetch user profile info
  const userProfile = useQuery(api.auth.listUsers, {});
  // Removed redundant saveUserProfile call. Profile upsert now only happens after sign-up.
  const profile = React.useMemo(() => {
    if (!userProfile || !viewedUserId) return null;
    return userProfile.find((u: any) => u.userId === viewedUserId);
  }, [userProfile, viewedUserId]);

  // Fetch follower/following counts
  const followers = useQuery(api.follows.getFollowers, viewedUserId ? { userId: viewedUserId } : 'skip');
  const following = useQuery(api.follows.getFollowing, viewedUserId ? { userId: viewedUserId } : 'skip');
  const isFollowing = useQuery(api.follows.isFollowingUser, viewedUserId && currentUserId && viewedUserId !== currentUserId ? { userId: viewedUserId } : 'skip');

  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);

  const handleFollow = async () => {
    if (!viewedUserId) return;
    await followUser({ userId: viewedUserId });
  };
  const handleUnfollow = async () => {
    if (!viewedUserId) return;
    await unfollowUser({ userId: viewedUserId });
  };

  const FALLBACK_DISPLAY_NAME = "Name can't be displayed";
  // Own profile: use current user's name/email from auth; else profile. Other users: name only (never show their email).
  const rawDisplayName = viewedUserId === currentUserId
    ? (currentUser?.name ?? currentUser?.email ?? profile?.name ?? profile?.email ?? FALLBACK_DISPLAY_NAME)
    : (profile?.name ?? FALLBACK_DISPLAY_NAME);
  // Never show trailing " 2", " 3", etc. (e.g. from auth duplicate-name handling)
  const displayName = typeof rawDisplayName === 'string'
    ? rawDisplayName.replace(/\s+\d+$/, '').trim() || FALLBACK_DISPLAY_NAME
    : FALLBACK_DISPLAY_NAME;

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarRow}>
          {profile?.imageUrl ? (
            <Image source={{ uri: profile.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{(displayName && displayName !== FALLBACK_DISPLAY_NAME ? displayName[0] : '?').toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.profileNameNextToAvatar} numberOfLines={1}>{displayName}</Text>
        </View>
        {viewedUserId === currentUserId && profile?.email && (
          <Text style={styles.profileEmail}>{profile.email}</Text>
        )}
        <View style={styles.countsRow}>
          <View style={styles.countBox}>
            <Text style={styles.countNumber}>{followers ? followers.length : '-'}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countNumber}>{following ? following.length : '-'}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </View>
        </View>
        {/* When viewing someone else's profile: show Follow/Unfollow below their counts */}
        {viewedUserId && currentUserId && viewedUserId !== currentUserId ? (
          <TouchableOpacity
            style={[styles.followButtonBase, isFollowing ? styles.unfollowButton : styles.followButton]}
            onPress={isFollowing ? handleUnfollow : handleFollow}
          >
            <Text style={isFollowing ? styles.unfollowButtonText : styles.followButtonText}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {/* Wrapped is only visible on your own profile */}
      {viewedUserId === currentUserId ? (
        <FlatList
          data={stats}
          renderItem={({ item, index }) => <Pane item={item} index={index} />}
          keyExtractor={(_, idx) => idx.toString()}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          snapToInterval={CARD_HEIGHT}
          decelerationRate="fast"
          disableIntervalMomentum={true}
          contentContainerStyle={{}}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: '#e0e7ef',
  },
  profileNameNextToAvatar: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: '#e0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#888',
  },
  profileEmail: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  countBox: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  countNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  countLabel: {
    fontSize: 14,
    color: '#888',
  },
  followButtonBase: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'center',
  },
  followButton: {
    backgroundColor: '#007AFF',
  },
  unfollowButton: {
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  unfollowButtonText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pane: {
    width,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    marginTop: -40,
  },
  iconContainer: {
    backgroundColor: '#e0e7ef',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
    fontFamily: 'PublicSans',
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PublicSans',
    marginBottom: 8,
    color: '#222',
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'PublicSans',
    color: '#555',
    letterSpacing: 0.3,
  },
});