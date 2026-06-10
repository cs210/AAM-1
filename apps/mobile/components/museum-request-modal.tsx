import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAction } from 'convex/react';
import { XIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MUTED_ICON_COLOR = '#73706c';

/** Normalized key for a requested museum name (matches backend normalization). */
export function normalizeMuseumRequestName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

type SheetProps = {
  initialMuseumName: string;
  onClose: () => void;
  /** Called with the trimmed museum name after a successful submission. */
  onSubmitted?: (museumName: string) => void;
};

type ModalProps = SheetProps & {
  visible: boolean;
};

/**
 * The "request a missing museum" bottom sheet body WITHOUT a Modal wrapper.
 * Use this when you need to render the form on top of an already-open Modal
 * (iOS does not reliably present a Modal over another Modal). Render it inside
 * an `absolute inset-0` container so it covers its parent.
 */
export function MuseumRequestSheet({ initialMuseumName, onClose, onSubmitted }: SheetProps) {
  const submitMuseumAdditionRequest = useAction(
    api.museumAdditionRequests.submitMuseumAdditionRequest
  );
  const [museumName, setMuseumName] = useState(initialMuseumName);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMuseumName(initialMuseumName);
    setCity('');
    setState('');
    setWebsite('');
    setNote('');
    setErrorMessage(null);
  }, [initialMuseumName]);

  const canSubmit = museumName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const trimmedName = museumName.trim();
      await submitMuseumAdditionRequest({
        museumName: trimmedName,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        website: website.trim() || undefined,
        note: note.trim() || undefined,
      });
      onSubmitted?.(trimmedName);
      onClose();
    } catch (error) {
      console.error('Failed to submit museum request:', error);
      setErrorMessage("We couldn't send this request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Dismiss museum request form"
        />
        <View className="z-10 max-h-[90%] rounded-t-3xl bg-background shadow-lg">
          <View className="border-border border-b px-5 pb-4 pt-3">
            <View className="bg-muted mx-auto mb-3 h-1 w-10 rounded-full" />
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-xl font-bold">Request a museum</Text>
                <Text className="text-muted-foreground mt-1 text-sm leading-5">
                  Share what you know and our team can review it.
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Close museum request form"
                onPress={onClose}
                className="shrink-0">
                <XIcon size={21} color={MUTED_ICON_COLOR} />
              </Button>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Museum name</Text>
                <Input
                  value={museumName}
                  onChangeText={setMuseumName}
                  placeholder="Museum name"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Text className="text-foreground text-sm font-semibold">City</Text>
                  <Input
                    value={city}
                    onChangeText={setCity}
                    placeholder="Optional"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                <View className="w-24 gap-2">
                  <Text className="text-foreground text-sm font-semibold">State</Text>
                  <Input
                    value={state}
                    onChangeText={setState}
                    placeholder="CA"
                    autoCapitalize="characters"
                    maxLength={24}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Website</Text>
                <Input
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="Optional"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="next"
                />
              </View>

              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Anything else?</Text>
                <Input
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional note for the team"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {errorMessage ? (
                <View className="border-destructive/30 bg-destructive/10 rounded-2xl border px-3 py-2">
                  <Text className="text-destructive text-sm leading-5">{errorMessage}</Text>
                </View>
              ) : null}

              <View className="mt-2 flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onPress={onClose}
                  disabled={isSubmitting}>
                  <Text className="text-base font-semibold">Cancel</Text>
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onPress={handleSubmit}
                  disabled={!canSubmit || isSubmitting}>
                  <Text className="text-primary-foreground text-base font-semibold">
                    {isSubmitting ? 'Sending...' : 'Submit'}
                  </Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
  );
}

/**
 * Self-contained "request a missing museum" form wrapped in its own Modal.
 * Use this on screens where it is NOT rendered on top of another Modal.
 */
export function MuseumRequestModal({ visible, initialMuseumName, onClose, onSubmitted }: ModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <MuseumRequestSheet
        initialMuseumName={initialMuseumName}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    </Modal>
  );
}
