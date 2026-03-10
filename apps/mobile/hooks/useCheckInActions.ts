import { useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';

/**
 * Shared hook for updating and deleting check-ins. Use on both the home feed
 * and profile so we don't duplicate mutation + close logic.
 */
export function useCheckInActions(onClose: () => void) {
  const updateCheckIn = useMutation(api.checkIns.updateCheckIn);
  const deleteCheckInMutation = useMutation(api.checkIns.deleteCheckIn);

  const saveCheckIn = async (
    checkInId: Id<'museumCheckIns'>,
    rating: number | null,
    review: string
  ) => {
    await updateCheckIn({
      checkInId,
      rating: rating ?? undefined,
      review: review || undefined,
    });
    onClose();
  };

  const deleteCheckIn = async (checkInId: Id<'museumCheckIns'>) => {
    await deleteCheckInMutation({ checkInId });
    onClose();
  };

  return { saveCheckIn, deleteCheckIn };
}
