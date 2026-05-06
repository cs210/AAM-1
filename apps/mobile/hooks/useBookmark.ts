import { useMutation, useQuery } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { useState, useEffect } from 'react';
import { captureMobile } from '@/lib/analytics';

export const useBookmark = (museumId: Id<'museums'>) => {
  const posthog = usePostHog();
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const isBookmarkedQuery = useQuery(api.bookmarks.isBookmarked, { museumId });
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isBookmarkedQuery !== undefined) {
      setIsBookmarked(isBookmarkedQuery);
    }
  }, [isBookmarkedQuery]);

  const handleToggleBookmark = async () => {
    setIsLoading(true);
    try {
      const result = await toggleBookmark({ museumId });
      setIsBookmarked(result.bookmarked);
      captureMobile(posthog, 'museum_bookmark_toggled', {
        museumId: String(museumId),
        bookmarked: result.bookmarked,
      });
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isBookmarked,
    isLoading,
    toggleBookmark: handleToggleBookmark,
  };
};
