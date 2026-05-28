import { router } from 'expo-router';

type CheckinReviewTarget = {
  _id: string;
  contentId: string;
};

export function openCheckinReview(checkin: CheckinReviewTarget) {
  router.push(
    `/(museums)/${checkin.contentId}?tab=reviews&highlight=${encodeURIComponent(checkin._id)}`
  );
}
