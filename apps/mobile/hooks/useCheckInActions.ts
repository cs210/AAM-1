import { useMutation } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';

/**
 * Shared hook for updating and deleting check-ins. Use on both the home feed
 * and profile so we don't duplicate mutation + close logic.
 */
export function useCheckInActions(onClose: () => void) {
  const updateCheckIn = useMutation(api.checkIns.updateCheckIn);
  const deleteCheckInMutation = useMutation(api.checkIns.deleteCheckIn);
  const posthog = usePostHog();

  const saveCheckIn = async (
    checkInId: Id<'checkIns'>,
    rating: number | null,
    review: string
  ) => {
    await updateCheckIn({
      checkInId,
      rating: rating ?? undefined,
      review: review || undefined,
    });

    posthog?.capture('museum_visit_updated', {
      checkInId: String(checkInId),
      hasRating: rating !== null,
      hasReview: review.trim().length > 0,
    });

    onClose();
  };

  const deleteCheckIn = async (checkInId: Id<'checkIns'>) => {
    await deleteCheckInMutation({ checkInId });
    onClose();
  };

  return { saveCheckIn, deleteCheckIn };
}
