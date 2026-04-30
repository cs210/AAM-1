import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { useState, useEffect } from 'react';

export const useBookmark = (museumId: Id<'museums'>) => {
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
