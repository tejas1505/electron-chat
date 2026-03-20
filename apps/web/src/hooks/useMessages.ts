import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { messagesApi } from '@/services/messages';
import { useChatStore } from '@/store/chatStore';

export function useMessages(roomId: string) {
  const { setMessages, prependMessages, markRead } = useChatStore();
  const initializedRef = useRef<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: ({ pageParam }) =>
      messagesApi.getMessages(roomId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!roomId,
    staleTime: 30_000,
  });

  // BUG FIX: setMessages (not prepend) on first load — no duplicates
  useEffect(() => {
    if (!query.data || !roomId) return;

    const allPages = query.data.pages;
    const isFirstLoad = initializedRef.current !== roomId;

    if (isFirstLoad) {
      // First load: set the first page directly (already sorted oldest→newest)
      const firstPageMessages = [...(allPages[0]?.data ?? [])].reverse();
      setMessages(roomId, firstPageMessages);
      initializedRef.current = roomId;
      markRead(roomId);
    } else if (allPages.length > 1) {
      // Load-more: prepend older messages from the newest page added
      const lastPage = allPages[allPages.length - 1];
      const olderMessages = [...lastPage.data].reverse();
      prependMessages(roomId, olderMessages);
    }
  }, [query.data?.pages.length, roomId]);

  // Reset when room changes
  useEffect(() => {
    initializedRef.current = null;
  }, [roomId]);

  return {
    isLoading: query.isLoading,
    fetchMore: query.fetchNextPage,
    hasMore: query.hasNextPage,
    isFetchingMore: query.isFetchingNextPage,
  };
}
