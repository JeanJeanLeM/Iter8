import type { InfiniteData } from '@tanstack/react-query';
import type * as p from '../accessPermissions';
import type * as a from '../types/agents';
import type * as s from '../schemas';
import type * as t from '../types';

export type Conversation = {
  id: string;
  createdAt: number;
  participants: string[];
  lastMessage: string;
  conversations: s.TConversation[];
};

export type ConversationListParams = {
  cursor?: string;
  isArchived?: boolean;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  tags?: string[];
  search?: string;
};

export type MinimalConversation = Pick<
  s.TConversation,
  'conversationId' | 'endpoint' | 'title' | 'createdAt' | 'updatedAt' | 'user'
>;

export type ConversationListResponse = {
  conversations: MinimalConversation[];
  nextCursor: string | null;
};

export type ConversationData = InfiniteData<ConversationListResponse>;
export type ConversationUpdater = (
  data: ConversationData,
  conversation: s.TConversation,
) => ConversationData;

/* Messages */
export type MessagesListParams = {
  cursor?: string | null;
  sortBy?: 'endpoint' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  conversationId?: string;
  messageId?: string;
  search?: string;
};

export type MessagesListResponse = {
  messages: s.TMessage[];
  nextCursor: string | null;
};

/* Shared Links */
export type SharedMessagesResponse = Omit<s.TSharedLink, 'messages'> & {
  messages: s.TMessage[];
};

export interface SharedLinksListParams {
  pageSize: number;
  isPublic: boolean;
  sortBy: 'title' | 'createdAt';
  sortDirection: 'asc' | 'desc';
  search?: string;
  cursor?: string;
}

export type SharedLinkItem = {
  shareId: string;
  title: string;
  isPublic: boolean;
  createdAt: Date;
  conversationId: string;
};

export interface SharedLinksResponse {
  links: SharedLinkItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface SharedLinkQueryData {
  pages: SharedLinksResponse[];
  pageParams: (string | null)[];
}

export type AllPromptGroupsFilterRequest = {
  category: string;
  pageNumber: string;
  pageSize: string | number;
  before?: string | null;
  after?: string | null;
  order?: 'asc' | 'desc';
  name?: string;
  author?: string;
};

export type AllPromptGroupsResponse = t.TPromptGroup[];

export type ConversationTagsResponse = s.TConversationTag[];

/* MCP Types */
export type MCPTool = {
  name: string;
  pluginKey: string;
  description: string;
};

export type MCPServer = {
  name: string;
  icon: string;
  authenticated: boolean;
  authConfig: s.TPluginAuthConfig[];
  tools: MCPTool[];
};

export type MCPServersResponse = {
  servers: Record<string, MCPServer>;
};

export type VerifyToolAuthParams = { toolId: string };
export type VerifyToolAuthResponse = {
  authenticated: boolean;
  message?: string | s.AuthType;
  authTypes?: [string, s.AuthType][];
};

export type GetToolCallParams = { conversationId: string };
export type ToolCallResults = a.ToolCallResult[];

/* Memories */
export type TUserMemory = {
  key: string;
  value: string;
  updated_at: string;
  tokenCount?: number;
};

export type MemoriesResponse = {
  memories: TUserMemory[];
  totalTokens: number;
  tokenLimit: number | null;
  usagePercentage: number | null;
};

export type PrincipalSearchParams = {
  q: string;
  limit?: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
};

export type PrincipalSearchResponse = {
  query: string;
  limit: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
  results: p.TPrincipalSearchResult[];
  count: number;
  sources: {
    local: number;
    entra: number;
  };
};

export type AccessRole = {
  accessRoleId: p.AccessRoleIds;
  name: string;
  description: string;
  permBits: number;
};

export type AccessRolesResponse = AccessRole[];

export interface MCPServerStatus {
  requiresOAuth: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPConnectionStatusResponse {
  success: boolean;
  connectionStatus: Record<string, MCPServerStatus>;
}

export interface MCPServerConnectionStatusResponse {
  success: boolean;
  serverName: string;
  requiresOAuth: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPAuthValuesResponse {
  success: boolean;
  serverName: string;
  authValueFlags: Record<string, boolean>;
}

/* SharePoint Graph API Token */
export type GraphTokenParams = {
  scopes: string;
};

export type GraphTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

/* Recipes */
export type TRecipeIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
};
export type TRecipeStep = {
  order: number;
  instruction: string;
  ingredientsUsed?: string[];
  /** Duration in minutes for this step (e.g. cooking time). Used for timer in step-by-step mode. */
  durationMinutes?: number;
};

/** Duration in minutes, or object with prep/cook/total in minutes */
export type TRecipeDuration = number | { prep?: number; cook?: number; total?: number };

/** Recipe data sent as context to LLM when opening from book */
export type TRecipeDataForContext = {
  ingredients?: TRecipeIngredient[];
  steps?: TRecipeStep[];
  description?: string;
  duration?: TRecipeDuration;
  tags?: string[];
  equipment?: string[];
};

/** Recipe selected as modification target - injected into agent context */
export type TSelectedRecipeForVariation = {
  recipeId: string;
  title: string;
  parentId?: string | null;
  recipeData?: TRecipeDataForContext | null;
};

export type TRecipe = {
  _id: string;
  userId: string;
  parentId: string | null;
  variationNote?: string;
  objective?: string;
  emoji?: string;
  title: string;
  description?: string;
  portions?: number;
  duration?: TRecipeDuration;
  ingredients: TRecipeIngredient[];
  steps: TRecipeStep[];
  equipment?: string[];
  tags?: string[];
  dishType?: 'entree' | 'plat' | 'dessert';
  cuisineType?: string[];
  diet?: string[];
  imageUrl?: string;
  images?: Array<{ url: string; source: 'ai' | 'upload' }>;
  variationCount?: number;
  score?: number;
  userVote?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RecipesListParams = {
  ingredientsInclude?: string[];
  ingredientsExclude?: string[];
  dishType?: string;
  cuisineType?: string[];
  diet?: string[];
  parentsOnly?: boolean;
  parentId?: string | null;
  /** Fetch only recipes with these IDs */
  ids?: string[];
};

export type RecipesListResponse = {
  recipes: TRecipe[];
};

export type RecipeVoteResponse = {
  ok: boolean;
  score?: number;
};

/* Journal (realizations) */
export type TRealization = {
  _id: string;
  userId: string;
  recipeId: string;
  realizedAt: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TRealizationWithRecipe = TRealization & {
  recipeTitle?: string;
  recipeImageUrl?: string;
  recipeEmoji?: string;
  recipeParentId?: string | null;
  variationNote?: string;
};

export type JournalListParams = {
  recipeId?: string;
  fromDate?: string;
  toDate?: string;
  sort?: 'realizedAtDesc' | 'realizedAtAsc';
};

export type JournalListResponse = {
  realizations: TRealizationWithRecipe[];
};

export type CreateJournalEntryParams = {
  recipeId: string;
  realizedAt?: string;
  comment?: string;
};

/* Shopping list */
export type TShoppingListItem = {
  _id: string;
  userId: string;
  name: string;
  quantity?: number;
  unit?: string;
  bought: boolean;
  sourceRealizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ShoppingListParams = {
  bought?: boolean;
};

export type ShoppingListResponse = {
  items: TShoppingListItem[];
};

export type CreateShoppingListItemParams = {
  name: string;
  quantity?: number;
  unit?: string;
};

export type CreateShoppingListItemsParams = {
  items: Array<{ name: string; quantity?: number; unit?: string }>;
};

export type UpdateShoppingListItemParams = {
  name?: string;
  quantity?: number;
  unit?: string;
  bought?: boolean;
};

/* Ingredients gallery */
export type TNutritionMicros = {
  sodiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  vitaminCMg?: number;
  vitaminARaeUg?: number;
  vitaminDIu?: number;
  folateUg?: number;
  vitaminB12Ug?: number;
  zincMg?: number;
  seleniumUg?: number;
  magnesiumMg?: number;
};

export type TIngredient = {
  _id: string;
  name: string;
  displayName?: string;
  imageUrl?: string;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  fiberG?: number;
  nutritionMicros?: TNutritionMicros;
  usdaFdcId?: number | string;
  usdaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type IngredientsResponse = {
  ingredients: TIngredient[];
};

export type CreateIngredientParams = {
  name: string;
  displayName?: string;
};

export type UpdateIngredientParams = {
  displayName?: string;
  imageUrl?: string;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  fiberG?: number;
  nutritionMicros?: TNutritionMicros;
  usdaFdcId?: number | string;
  usdaDescription?: string;
};

/* Meal planner */
export type MealPlanSlot = 'breakfast' | 'collation' | 'lunch' | 'dinner' | 'sortie';

export type TPlannedMeal = {
  _id: string;
  userId: string;
  date: string;
  slot: MealPlanSlot;
  recipeId?: string | null;
  recipeTitle: string;
  recipeDishType?: 'entree' | 'plat' | 'dessert' | null;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdatePlannedMealParams = {
  date?: string;
  slot?: MealPlanSlot;
  recipeId?: string | null;
  recipeTitle?: string;
  comment?: string;
};

export type MealPlannerCalendarParams = {
  from: string;
  to: string;
};

export type MealPlannerCalendarResponse = {
  realizations: TRealizationWithRecipe[];
  plannedMeals: TPlannedMeal[];
};
