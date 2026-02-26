

import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
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

// No local helper needed; we'll fetch current user via Convex query

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


export default function WrappedScreen({ route }: any) {
  // If viewing another user's profile, their userId will be in route.params.userId
  // Otherwise, show current user's profile
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const viewedUserId = route?.params?.userId || currentUserId;

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

  return (
    <View style={styles.container}>
      {/* Profile info and follower/following counts */}
      <View style={styles.profileHeader}>
        {profile?.imageUrl ? (
          <Image source={{ uri: profile.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{profile?.name?.[0]?.toUpperCase() || '?'}</Text></View>
        )}
        <Text style={styles.profileTitle}>{profile?.name || profile?.email || 'Profile'}</Text>
        {profile?.email && <Text style={styles.profileEmail}>{profile.email}</Text>}
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
        {/* Show follow/unfollow button if not viewing own profile */}
        {viewedUserId && currentUserId && viewedUserId !== currentUserId && (
          <TouchableOpacity
            style={isFollowing ? styles.unfollowButton : styles.followButton}
            onPress={isFollowing ? handleUnfollow : handleFollow}
          >
            <Text style={styles.followButtonText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
          </TouchableOpacity>
        )}
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#e0e7ef',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#e0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#888',
  },
  profileEmail: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
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
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  unfollowButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  followButtonText: {
    color: '#fff',
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