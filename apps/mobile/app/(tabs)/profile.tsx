

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, Image, Pressable, ImageBackground, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeftIcon, StarIcon, MapPinIcon, PencilIcon, SettingsIcon, Sparkles } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { EditCheckinModal } from '@/components/edit-checkin-modal';
import { useCheckInActions } from '@/hooks/useCheckInActions';

const { width } = Dimensions.get('window');

type ProfileVisit = {
  checkIn: { _id: string; museumId: string; rating?: number; visitDate: number; createdAt: number; review?: string; editedAt?: number };
  museum: { _id: string; name: string; imageUrl?: string; category: string; city?: string };
};

function formatVisitDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PassportCard({
  visit,
  isOwnProfile,
  onEditPress,
}: {
  visit: ProfileVisit;
  isOwnProfile: boolean;
  onEditPress?: () => void;
}) {
  const { checkIn, museum } = visit;
  const onCardPress = () => router.push(`/(museums)/${museum._id}` as any);

  return (
    <View style={styles.passportCardWrapper}>
      <Pressable style={({ pressed }) => [styles.passportCard, pressed && styles.passportCardPressed]} onPress={onCardPress}>
        <View style={styles.passportCardInner}>
          <View style={styles.passportImageWrap}>
            {museum.imageUrl ? (
              <Image source={{ uri: museum.imageUrl }} style={styles.passportImage} resizeMode="cover" />
            ) : (
              <View style={[styles.passportImage, styles.passportImagePlaceholder]}>
                <Text style={styles.passportImageLetter}>{museum.name ? museum.name[0].toUpperCase() : '?'}</Text>
              </View>
            )}
          </View>
          <View style={styles.passportBody}>
            <View style={styles.passportTitleRow}>
              <Text style={styles.passportMuseumName} numberOfLines={2}>{museum.name}</Text>
              {isOwnProfile && onEditPress ? (
                <Pressable onPress={(e) => { e.stopPropagation(); onEditPress(); }} style={styles.editButton} hitSlop={8}>
                  <PencilIcon size={18} color="#D4915A" />
                </Pressable>
              ) : null}
            </View>
            {museum.city ? (
              <View style={styles.passportLocationRow}>
                <MapPinIcon size={12} color="#6b7280" />
                <Text style={styles.passportLocation}>{museum.city}</Text>
              </View>
            ) : null}
            <View style={styles.passportDateStamp}>
              <Text style={styles.passportDateText}>{formatVisitDate(checkIn.visitDate)}</Text>
              {checkIn.editedAt != null ? (
                <Text style={styles.editedLabel}> · Edited</Text>
              ) : null}
            </View>
            {checkIn.rating != null ? (
              <View style={styles.passportStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    size={14}
                    color={star <= checkIn.rating! ? '#FFB800' : '#D0D0D0'}
                    fill={star <= checkIn.rating! ? '#FFB800' : 'none'}
                  />
                ))}
                <Text style={styles.passportRatingNum}>{checkIn.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {checkIn.review ? (
              <Text style={styles.passportReview} numberOfLines={2}>{checkIn.review}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}


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

  // Cultural passport: visits for the profile being viewed
  const profileVisits = useQuery(
    api.checkIns.getProfileVisits,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );

  // Taste profile (for display next to name)
  const tasteProfile = useQuery(
    api.wrapped.getTasteProfileForUser,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );

  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);

  const [editingVisit, setEditingVisit] = useState<ProfileVisit | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingVisit(null));

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
    <Pressable style={styles.container} onPress={() => showSettingsDropdown && setShowSettingsDropdown(false)}>
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
            
            {/* Settings Icon or Follow/Unfollow Button - Top Right */}
            {!isViewingOtherProfile ? (
              <View>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <SettingsIcon size={20} color="#1A1A1A" />
                </TouchableOpacity>
                
                {/* Settings Dropdown */}
                {showSettingsDropdown && (
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setShowSettingsDropdown(false);
                        router.push('/intake?redirect=/(tabs)/profile');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>Preferences</Text>
                    </TouchableOpacity>
                    <View style={styles.dropdownDivider} />
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={async () => {
                        setShowSettingsDropdown(false);
                        const { authClient } = await import('@/lib/auth-client');
                        await authClient.signOut();
                        router.replace('/sign-in');
                      }}
                    >
                      <Text style={[styles.dropdownItemText, styles.logoutText]}>Log out</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.topRightFollowButton, isFollowing ? styles.unfollowButton : styles.followButton]}
                onPress={isFollowing ? handleUnfollow : handleFollow}
              >
                <Text style={isFollowing ? styles.unfollowButtonText : styles.followButtonText}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Name and Taste profile badge */}
          <View style={styles.nameSection}>
            <View style={styles.nameAndBadgeRow}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              {tasteProfile?.profileName ? (
                <View style={styles.tasteProfileBadge}>
                  <Text style={styles.tasteProfileBadgeText}>{tasteProfile.profileName}</Text>
                </View>
              ) : null}
            </View>
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
        </View>
      </View>
      
      {/* Wrapped Section - Only show for own profile */}
      {!isViewingOtherProfile && (
        <TouchableOpacity 
          style={styles.wrappedSection}
          onPress={() => router.push('/wrapped')}
          activeOpacity={0.7}
        >
          <View style={styles.wrappedContent}>
            <Sparkles size={18} color="#D4915A" />
            <Text style={styles.wrappedText}>Wrapped</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Cultural passport: own profile or when viewing another user's visits */}
      {viewedUserId ? (
        profileVisits === undefined ? (
          <View style={styles.passportLoading}>
            <Text style={styles.passportLoadingText}>Loading visits...</Text>
          </View>
        ) : profileVisits.length === 0 ? (
          <View style={styles.passportEmpty}>
            <Text style={styles.passportEmptyTitle}>
              {viewedUserId === currentUserId ? 'No visits yet' : 'No visits'}
            </Text>
            <Text style={styles.passportEmptySub}>
              {viewedUserId === currentUserId
                ? 'Check in at a museum to start your passport.'
                : 'This user has not checked in anywhere yet.'}
            </Text>
            {viewedUserId === currentUserId && (
              <TouchableOpacity
                style={styles.passportEmptyButton}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.passportEmptyButtonText}>Explore museums</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={profileVisits}
            keyExtractor={(item) => item.checkIn._id}
            renderItem={({ item }) => (
              <PassportCard
                visit={item}
                isOwnProfile={viewedUserId === currentUserId}
                onEditPress={viewedUserId === currentUserId ? () => setEditingVisit(item) : undefined}
              />
            )}
            contentContainerStyle={styles.passportListContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.passportSectionHeader}>
                <Text style={styles.passportSectionSub}>{profileVisits.length} visit{profileVisits.length !== 1 ? 's' : ''}</Text>
              </View>
            }
          />
        )
      ) : null}

      <EditCheckinModal
        visible={editingVisit != null}
        initialRating={editingVisit?.checkIn.rating ?? null}
        initialReview={editingVisit?.checkIn.review}
        onSave={(rating, review) =>
          editingVisit &&
          saveCheckIn(editingVisit.checkIn._id as Id<'checkIns'>, rating, review)
        }
        onDelete={() =>
          editingVisit && deleteCheckIn(editingVisit.checkIn._id as Id<'checkIns'>)
        }
        onClose={() => setEditingVisit(null)}
      />
    </Pressable>
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
    paddingBottom: 12,
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
    backgroundColor: '#D4915A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 88,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 160,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  logoutText: {
    color: '#DC2626',
  },
  nameSection: {
    marginBottom: 8,
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    flexShrink: 1,
  },
  tasteProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(212, 145, 90, 0.15)',
    borderRadius: 14,
  },
  tasteProfileBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4915A',
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
    fontSize: 14,
    color: '#888',
  },
  followButtonBase: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  viewWrappedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonBase: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  followButton: {
    backgroundColor: '#D4915A',
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
  topRightFollowButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 48,
  },
  wrappedSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4915A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  wrappedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wrappedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4915A',
  },
  passportSectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  passportSectionSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  passportListContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  passportCardWrapper: {
    marginBottom: 14,
  },
  passportCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  passportCardPressed: {
    opacity: 0.95,
  },
  passportCardInner: {
    flexDirection: 'row',
    padding: 12,
  },
  passportImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 14,
  },
  passportImage: {
    width: '100%',
    height: '100%',
  },
  passportImagePlaceholder: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportImageLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#94a3b8',
  },
  passportBody: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  passportTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  passportMuseumName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  editButton: {
    padding: 4,
  },
  editedLabel: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  passportLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  passportLocation: {
    fontSize: 13,
    color: '#64748b',
  },
  passportDateStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    marginBottom: 6,
  },
  passportDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
  },
  passportStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passportRatingNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
  },
  passportReview: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 4,
  },
  passportLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  passportLoadingText: {
    fontSize: 15,
    color: '#64748b',
  },
  passportEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  passportEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  passportEmptySub: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  passportEmptyButton: {
    backgroundColor: '#D4915A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  passportEmptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});