import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { InfiniteData } from '@tanstack/react-query';
import { recipeMessageMap } from '~/store';
import { findConversationInInfinite } from '~/utils';
import type { ConversationCursorData } from '~/utils/convos';

export interface ConversationMention {
  id: string;
  title?: string;
}

/**
 * Returns conversations that mention a given recipe, based on recipeMessageMap.
 * Uses cache first, then fetches from API for IDs not in cache.
 */
export function useConversationsMentioningRecipe(recipeId: string | undefined): {
  conversationIds: string[];
  conversations: ConversationMention[];
  isLoading: boolean;
} {
  const map = useRecoilValue(recipeMessageMap);
  const queryClient = useQueryClient();

  const conversationIds = useMemo(() => {
    if (!recipeId) return [];
    const ids = new Set<string>();
    for (const [convId, msgMap] of Object.entries(map)) {
      if (convId === 'new' || !convId) continue;
      const recipeIds = Object.values(msgMap ?? {});
      if (recipeIds.includes(recipeId)) {
        ids.add(convId);
      }
    }
    return Array.from(ids);
  }, [map, recipeId]);

  const queries = useQueries({
    queries: conversationIds.map((id) => ({
      queryKey: [QueryKeys.conversation, id],
      queryFn: async () => {
        const convosQuery = queryClient.getQueryData<InfiniteData<ConversationCursorData>>(
          [QueryKeys.allConversations],
          { exact: false },
        );
        const found = findConversationInInfinite(convosQuery, id);
        if (found) return found;
        return dataService.getConversationById(id);
      },
      enabled: !!recipeId && conversationIds.includes(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const conversations: ConversationMention[] = useMemo(() => {
    return conversationIds.map((id, i) => {
      const result = queries[i]?.data;
      return {
        id,
        title: result?.title ?? undefined,
      };
    });
  }, [conversationIds, queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return {
    conversationIds,
    conversations,
    isLoading,
  };
}
