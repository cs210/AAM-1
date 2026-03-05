import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StarIcon } from 'lucide-react-native';

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
        { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Edit check-in</Text>

          <Text style={styles.label}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(rating === star ? null : star)}
                style={styles.starButton}
              >
                <StarIcon
                  size={36}
                  color={star <= (rating ?? 0) ? '#FFB800' : '#E0E0E0'}
                  fill={star <= (rating ?? 0) ? '#FFB800' : 'none'}
                />
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            style={styles.input}
            value={review}
            onChangeText={setReview}
            placeholder="What did you think?"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete check-in</Text>
            </TouchableOpacity>
            <View style={styles.saveRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '600',
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
