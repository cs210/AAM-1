import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { StarIcon, PencilIcon } from 'lucide-react-native';

export interface CheckinPostData {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  museumId: string;
  museumName: string;
  rating?: number;
  review?: string;
  createdAt: number;
  editedAt?: number;
}

type CheckinPostProps = {
  checkin: CheckinPostData;
  isOwnCheckin?: boolean;
  onEditPress?: () => void;
};

export const CheckinPost = ({ checkin, isOwnCheckin, onEditPress }: CheckinPostProps) => {
  const handlePress = () => {
    router.push(`/(museums)/${checkin.museumId}`);
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            size={14}
            color={star <= rating ? '#FFB800' : '#D0D0D0'}
            fill={star <= rating ? '#FFB800' : 'none'}
          />
        ))}
      </View>
    );
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      android_ripple={{ color: '#E8E8E8' }}
    >
      {/* Header: User info + Rating */}
      <View style={styles.headerRow}>
        <View style={styles.userSection}>
          {checkin.userImage && (
            <Image
              source={{ uri: checkin.userImage }}
              style={styles.userImage}
            />
          )}
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {checkin.userName}
              </Text>
              {isOwnCheckin && onEditPress && (
                <Pressable onPress={(e) => { e.stopPropagation(); onEditPress(); }} style={styles.editIcon} hitSlop={8}>
                  <PencilIcon size={16} color="#007AFF" />
                </Pressable>
              )}
            </View>
            <Text style={styles.museumName} numberOfLines={1}>
              {checkin.museumName}
            </Text>
            {checkin.editedAt != null ? (
              <Text style={styles.editedLabel}>Edited</Text>
            ) : null}
          </View>
        </View>

        {/* Rating on the right */}
        {checkin.rating && (
          <View style={styles.ratingSection}>
            {renderStars(checkin.rating)}
            <Text style={styles.ratingNumber}>{checkin.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Review text */}
      {checkin.review && (
        <Text style={styles.review} numberOfLines={3}>
          {checkin.review}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#D0D0D0',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  editIcon: {
    padding: 2,
  },
  editedLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  museumName: {
    fontSize: 13,
    color: '#8E8E93',
  },
  ratingSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
  },
  review: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
