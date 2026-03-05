

import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Animated, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeftIcon } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';

const { width, height } = Dimensions.get('window');
// Pane height fits the area below the profile header so content isn't shifted down
const PROFILE_HEADER_APPROX = 220;
const CARD_HEIGHT = Math.max(height - PROFILE_HEADER_APPROX, 400);

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
  const { userId: paramUserId, search: paramSearch } = useLocalSearchParams<{ userId?: string | string[]; search?: string | string[] }>();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  // When navigating from search, userId is in URL params; otherwise show current user's profile
  const paramUserIdStr = Array.isArray(paramUserId) ? paramUserId[0] : paramUserId;
  const viewedUserId = (typeof paramUserIdStr === 'string' && paramUserIdStr ? paramUserIdStr : null) || currentUserId;
  const searchFromParams = Array.isArray(paramSearch) ? paramSearch[0] : paramSearch;
  const returnSearch = typeof searchFromParams === 'string' ? searchFromParams : '';
  const isViewingOtherProfile = viewedUserId && currentUserId && viewedUserId !== currentUserId;

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

  const handleBackToSearch = () => {
    const search = encodeURIComponent(returnSearch);
    router.replace(`/(tabs)/explore?tab=people&search=${search}`);
  };

  return (
    <View style={styles.container}>
      {isViewingOtherProfile ? (
        <View style={styles.backBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSearch} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeftIcon size={24} color="#222" />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.profileHeader}>
        {/* Banner Image */}
        <ImageBackground
          source={require('@/assets/images/login-background.jpg')}
          style={styles.bannerImage}
          imageStyle={styles.bannerImageStyle}
          resizeMode="cover"
        >
          <View style={styles.bannerOverlay} />
        </ImageBackground>
        
        {/* Profile Content */}
        <View style={styles.profileContent}>
          <View style={styles.topRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {profile?.imageUrl ? (
                <Image source={{ uri: profile.imageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{(displayName && displayName !== FALLBACK_DISPLAY_NAME ? displayName[0] : '?').toUpperCase()}</Text>
                </View>
              )}
            </View>
            
            {/* Preferences Button - Top Right */}
            {!isViewingOtherProfile && (
              <TouchableOpacity
                style={styles.updatePreferencesButton}
                onPress={() => router.push('/intake?redirect=/(tabs)/profile')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.updatePreferencesText}>Preferences</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Name and Email */}
          <View style={styles.nameSection}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            {viewedUserId === currentUserId && profile?.email && (
              <Text style={styles.profileEmail}>{profile.email}</Text>
            )}
            
            {/* Followers/Following Row */}
            <View style={styles.countsRow}>
              <Text style={styles.countText}>
                <Text style={styles.countNumber}>{followers ? followers.length : '0'}</Text>
                <Text style={styles.countLabel}> Followers</Text>
              </Text>
              <Text style={styles.countText}>
                <Text style={styles.countNumber}>{following ? following.length : '0'}</Text>
                <Text style={styles.countLabel}> Following</Text>
              </Text>
            </View>
          </View>
          
          {/* When viewing someone else's profile: show Follow/Unfollow */}
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
    backgroundColor: '#FFFFFF',
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bannerImage: {
    width: '100%',
    height: 120,
  },
  bannerImageStyle: {
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  profileContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -40,
    marginBottom: 12,
  },
  avatarContainer: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 44,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8D5C4',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A67C52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updatePreferencesButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginTop: 48,
  },
  updatePreferencesText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
  nameSection: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  countText: {
    fontSize: 13,
  },
  countNumber: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  countLabel: {
    fontWeight: '400',
    color: '#666',
  },
  followButtonBase: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  followButton: {
    backgroundColor: '#A67C52',
  },
  unfollowButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  unfollowButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  pane: {
    width,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
  },
  iconContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  icon: {
    fontSize: 56,
    fontWeight: '400',
    color: '#1A1A1A',
    marginBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
  },
});