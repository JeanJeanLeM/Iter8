import { atom } from 'recoil';

/**
 * Maps conversationId to the _id of the first (mother) recipe saved from that conversation.
 * Used to link subsequent recipe variations as children (parentId = mother's _id).
 */
export const recipeConversationParentMap = atom<Record<string, string>>({
  key: 'recipeConversationParentMap',
  default: {},
});
