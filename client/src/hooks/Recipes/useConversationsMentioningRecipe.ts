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
 * Returns conversations that mention a given recipe, based on recipeMessageMap
 * and optionally the recipe's conversationId (chat where it was created).
 * Uses cache first, then fetches from API for IDs not in cache.
 */
export function useConversationsMentioningRecipe(
  recipeId: string | undefined,
  /** Conversation where the recipe was created (stored on recipe). Shown even if not in map. */
  recipeConversationId?: string | null,
): {
  conversationIds: string[];
  conversations: ConversationMention[];
  isLoading: boolean;
} {
  const map = useRecoilValue(recipeMessageMap);
  const queryClient = useQueryClient();

  const conversationIds = useMemo(() => {
    const ids = new Set<string>();
    if (recipeConversationId && recipeConversationId !== 'new' && recipeConversationId.length > 1) {
      ids.add(recipeConversationId);
    }
    if (!recipeId) return Array.from(ids);
    for (const [convId, msgMap] of Object.entries(map)) {
      if (convId === 'new' || !convId) continue;
      const recipeIds = Object.values(msgMap ?? {}).map(String);
      if (recipeIds.includes(String(recipeId))) {
        ids.add(convId);
      }
    }
    return Array.from(ids);
  }, [map, recipeId, recipeConversationId]);

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
