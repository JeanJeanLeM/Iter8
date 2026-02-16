import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@librechat/client';
import { PenLine, ChefHat } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useMessagesViewContext, useAddedChatContext } from '~/Providers';

const WRITE_RECIPE_PROMPT =
  "Structure cette recette avec l'outil update_recipe pour que je puisse l'ajouter à mon livre de recettes.";

interface WriteRecipeButtonProps {
  disabled?: boolean;
}

export default function WriteRecipeButton({ disabled }: WriteRecipeButtonProps) {
  const localize = useLocalize();
  const { ask, getMessages, setMessages, latestMessage } = useMessagesViewContext();
  const { conversation: addedConvo } = useAddedChatContext();

  const handleClick = useCallback(() => {
    const rootMessages = getMessages();
    const isLatestInRootMessages = rootMessages?.some(
      (message) => message.messageId === latestMessage?.messageId,
    );
    if (!isLatestInRootMessages && latestMessage) {
      setMessages([...(rootMessages || []), latestMessage]);
    }
    ask({ text: WRITE_RECIPE_PROMPT }, { addedConvo: addedConvo ?? undefined });
  }, [ask, getMessages, setMessages, latestMessage, addedConvo]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={disabled} onClick={handleClick} className="gap-1.5">
        <PenLine className="h-3.5 w-3.5" />
        {localize('com_ui_recipe_write_recipe')}
      </Button>
      <Link
        to="/r"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-active-alt hover:text-text-primary"
        title={localize('com_ui_recipe_go_to_cooking_mode')}
      >
        <ChefHat className="h-3.5 w-3.5" />
        {localize('com_ui_recipe_cooking_mode')}
      </Link>
    </div>
  );
}
