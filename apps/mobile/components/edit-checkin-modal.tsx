import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StarIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  visible: boolean;
  initialRating: number | null | undefined;
  initialReview: string | undefined;
  onSave: (rating: number | null, review: string) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function EditCheckinModal({
  visible,
  initialRating,
  initialReview,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [review, setReview] = useState(initialReview ?? '');

  useEffect(() => {
    if (visible) {
      setRating(initialRating ?? null);
      setReview(initialReview ?? '');
    }
  }, [visible, initialRating, initialReview]);

  const handleSave = () => {
    onSave(rating, review.trim());
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete check-in',
      'Remove this check-in from your passport? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ flex: 1 }}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} accessibilityLabel="Dismiss" />
        <View className="z-10 rounded-t-2xl bg-background px-6 pb-8 pt-3 shadow-lg">
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
          <Text className="mb-5 text-xl font-bold text-foreground">Edit check-in</Text>

          <Label nativeID="edit-checkin-rating" className="mb-2 text-muted-foreground">
            Rating
          </Label>
          <View className="mb-5 flex-row gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                accessibilityLabel={`${star} stars`}
                onPress={() => setRating(rating === star ? null : star)}
                className="rounded-lg p-1 active:opacity-80">
                <StarIcon
                  size={36}
                  color={star <= (rating ?? 0) ? '#FFB800' : '#E0E0E0'}
                  fill={star <= (rating ?? 0) ? '#FFB800' : 'none'}
                />
              </Pressable>
            ))}
          </View>

          <Label nativeID="edit-checkin-review" className="mb-2 text-muted-foreground">
            Comment (optional)
          </Label>
          <Input
            nativeID="edit-checkin-review"
            value={review}
            onChangeText={setReview}
            placeholder="What did you think?"
            multiline
            numberOfLines={3}
            className="mb-6 min-h-24 h-auto py-3 text-base leading-5"
            textAlignVertical="top"
          />

          <View className="gap-3">
            <Button
              variant="ghost"
              className="h-auto self-start px-0 py-2 active:opacity-80"
              onPress={handleDelete}>
              <Text className="text-base font-semibold text-destructive">Delete check-in</Text>
            </Button>
            <View className="flex-row justify-end gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="h-auto min-h-12 border-0 px-5 py-3"
                onPress={onClose}>
                <Text className="text-base font-semibold leading-normal text-secondary-foreground">
                  Cancel
                </Text>
              </Button>
              <Button
                size="lg"
                className="h-auto min-h-12 border-0 px-6 py-3"
                onPress={handleSave}>
                <Text className="text-base font-semibold leading-normal">Save</Text>
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
