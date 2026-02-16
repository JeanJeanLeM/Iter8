import React, { useCallback, useMemo, memo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { type TMessage, type TRecipe } from 'librechat-data-provider';
import type { TMessageProps, TMessageIcon } from '~/common';
import MessageContent from '~/components/Chat/Messages/Content/MessageContent';
import PlaceholderRow from '~/components/Chat/Messages/ui/PlaceholderRow';
import SiblingSwitch from '~/components/Chat/Messages/SiblingSwitch';
import HoverButtons from '~/components/Chat/Messages/HoverButtons';
import WriteRecipeHoverButton from '~/components/Chat/Messages/WriteRecipeHoverButton';
import RecipeFamilyCarousel from '~/components/Recipes/RecipeFamilyCarousel';
import { getAllContentText } from '~/utils/messages';
import MessageIcon from '~/components/Chat/Messages/MessageIcon';
import { useLocalize, useMessageActions, useContentMetadata } from '~/hooks';
import SubRow from '~/components/Chat/Messages/SubRow';
import { cn, getMessageAriaLabel } from '~/utils';
import { fontSizeAtom } from '~/store/fontSize';
import { recipeConversationParentMap, recipeMessageMap } from '~/store';
import { useRecipeQuery } from '~/data-provider';
import { MessageContext } from '~/Providers';
import store from '~/store';

type MessageRenderProps = {
  message?: TMessage;
  isSubmitting?: boolean;
} & Pick<
  TMessageProps,
  'currentEditId' | 'setCurrentEditId' | 'siblingIdx' | 'setSiblingIdx' | 'siblingCount'
>;

const MessageRender = memo(
  ({
    message: msg,
    siblingIdx,
    siblingCount,
    setSiblingIdx,
    currentEditId,
    setCurrentEditId,
    isSubmitting = false,
  }: MessageRenderProps) => {
    const localize = useLocalize();
    const {
      ask,
      edit,
      index,
      agent,
      assistant,
      enterEdit,
      conversation,
      messageLabel,
      latestMessage,
      handleFeedback,
      handleContinue,
      copyToClipboard,
      regenerateMessage,
    } = useMessageActions({
      message: msg,
      currentEditId,
      setCurrentEditId,
    });
    const fontSize = useAtomValue(fontSizeAtom);
    const maximizeChatSpace = useRecoilValue(store.maximizeChatSpace);

    const handleRegenerateMessage = useCallback(() => regenerateMessage(), [regenerateMessage]);
    const hasNoChildren = !(msg?.children?.length ?? 0);
    const isLast = useMemo(
      () => hasNoChildren && (msg?.depth === latestMessage?.depth || msg?.depth === -1),
      [hasNoChildren, msg?.depth, latestMessage?.depth],
    );
    const isLatestMessage = msg?.messageId === latestMessage?.messageId;
    /** Only pass isSubmitting to the latest message to prevent unnecessary re-renders */
    const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;

    const iconData: TMessageIcon = useMemo(
      () => ({
        endpoint: msg?.endpoint ?? conversation?.endpoint,
        model: msg?.model ?? conversation?.model,
        iconURL: msg?.iconURL,
        modelLabel: messageLabel,
        isCreatedByUser: msg?.isCreatedByUser,
      }),
      [
        messageLabel,
        conversation?.endpoint,
        conversation?.model,
        msg?.model,
        msg?.iconURL,
        msg?.endpoint,
        msg?.isCreatedByUser,
      ],
    );

    const { hasParallelContent } = useContentMetadata(msg);

    const [addedRecipe, setAddedRecipe] = useState<TRecipe | null>(null);
    const setParentMap = useSetRecoilState(recipeConversationParentMap);
    const setRecipeMessageMap = useSetRecoilState(recipeMessageMap);
    const parentMap = useRecoilValue(recipeConversationParentMap);
    const persistedRecipeMap = useRecoilValue(recipeMessageMap);
    const parentRecipeId = conversation?.conversationId ? parentMap[conversation.conversationId] ?? null : null;
    const persistedRecipeId =
      conversation?.conversationId && msg?.messageId
        ? persistedRecipeMap[conversation.conversationId]?.[msg.messageId] ?? null
        : null;
    const { data: persistedRecipe } = useRecipeQuery(
      addedRecipe ? null : persistedRecipeId,
      { enabled: !!persistedRecipeId && !addedRecipe },
    );
    const recipeToShow = addedRecipe ?? persistedRecipe ?? null;
    const handleRecipeAdded = useCallback(
      (recipe: TRecipe) => {
        setAddedRecipe(recipe);
        const convId = conversation?.conversationId;
        const msgId = msg?.messageId;
        if (convId && recipe?._id) {
          setParentMap((prev) => (prev[convId] ? prev : { ...prev, [convId]: recipe._id }));
        }
        if (convId && msgId && recipe?._id) {
          setRecipeMessageMap((prev) => ({
            ...prev,
            [convId]: { ...(prev[convId] ?? {}), [msgId]: recipe._id },
          }));
        }
      },
      [conversation?.conversationId, msg?.messageId, setParentMap, setRecipeMessageMap],
    );

    /** Show "Écrire la recette" button for assistant messages from agents endpoint (when HoverButtons are shown) */
    const showWriteRecipeButton = useMemo(() => {
      if (!msg || msg.isCreatedByUser) return false;
      const isAgentMessage =
        agent != null ||
        conversation?.endpoint === 'agents' ||
        !!conversation?.agent_id ||
        (typeof msg.model === 'string' && msg.model.startsWith('agent_'));
      return isAgentMessage;
    }, [msg, msg?.model, agent, conversation?.endpoint, conversation?.agent_id]);

    if (!msg) {
      return null;
    }

    const getChatWidthClass = () => {
      if (maximizeChatSpace) {
        return 'w-full max-w-full md:px-5 lg:px-1 xl:px-5';
      }
      if (hasParallelContent) {
        return 'md:max-w-[58rem] xl:max-w-[70rem]';
      }
      return 'md:max-w-[47rem] xl:max-w-[55rem]';
    };

    const baseClasses = {
      common: 'group mx-auto flex flex-1 gap-3 transition-all duration-300 transform-gpu ',
      chat: getChatWidthClass(),
    };

    const conditionalClasses = {
      focus: 'focus:outline-none focus:ring-2 focus:ring-border-xheavy',
    };

    return (
      <div
        id={msg.messageId}
        aria-label={getMessageAriaLabel(msg, localize)}
        className={cn(
          baseClasses.common,
          baseClasses.chat,
          conditionalClasses.focus,
          'message-render',
        )}
      >
        {!hasParallelContent && (
          <div className="relative flex flex-shrink-0 flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full">
              <MessageIcon iconData={iconData} assistant={assistant} agent={agent} />
            </div>
          </div>
        )}

        <div
          className={cn(
            'relative flex flex-col',
            hasParallelContent ? 'w-full' : 'w-11/12',
            msg.isCreatedByUser ? 'user-turn' : 'agent-turn',
          )}
        >
          {!hasParallelContent && (
            <h2 className={cn('select-none font-semibold', fontSize)}>{messageLabel}</h2>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex max-w-full flex-grow flex-col gap-0">
              <MessageContext.Provider
                value={{
                  messageId: msg.messageId,
                  conversationId: conversation?.conversationId,
                  isExpanded: false,
                  isSubmitting: effectiveIsSubmitting,
                  isLatestMessage,
                }}
              >
                <MessageContent
                  ask={ask}
                  edit={edit}
                  isLast={isLast}
                  text={msg.text || ''}
                  message={msg}
                  enterEdit={enterEdit}
                  error={!!(msg.error ?? false)}
                  isSubmitting={effectiveIsSubmitting}
                  unfinished={msg.unfinished ?? false}
                  isCreatedByUser={msg.isCreatedByUser ?? true}
                  siblingIdx={siblingIdx ?? 0}
                  setSiblingIdx={setSiblingIdx ?? (() => ({}))}
                />
              </MessageContext.Provider>
              {recipeToShow && (
                <RecipeFamilyCarousel
                  recipe={recipeToShow}
                  createdRecipeId={recipeToShow._id}
                />
              )}
            </div>
            {hasNoChildren && effectiveIsSubmitting ? (
              <PlaceholderRow />
            ) : (
              <SubRow classes="text-xs">
                <SiblingSwitch
                  siblingIdx={siblingIdx}
                  siblingCount={siblingCount}
                  setSiblingIdx={setSiblingIdx}
                />
                <HoverButtons
                  index={index}
                  isEditing={edit}
                  message={msg}
                  enterEdit={enterEdit}
                  isSubmitting={isSubmitting}
                  conversation={conversation ?? null}
                  regenerate={handleRegenerateMessage}
                  copyToClipboard={copyToClipboard}
                  handleContinue={handleContinue}
                  latestMessage={latestMessage}
                  handleFeedback={handleFeedback}
                  isLast={isLast}
                  extraButtons={
                    showWriteRecipeButton ? (
                      <WriteRecipeHoverButton
                        conversationId={conversation?.conversationId ?? null}
                        isLast={isLast}
                        isDisabled={effectiveIsSubmitting}
                        recipeText={getAllContentText(msg)}
                        onRecipeAdded={handleRecipeAdded}
                        parentRecipeId={parentRecipeId}
                        hideLinkForFirstRecipe={!!addedRecipe}
                      />
                    ) : undefined
                  }
                />
              </SubRow>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default MessageRender;
