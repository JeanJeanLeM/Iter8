import React from 'react';
import { ChevronUp, ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useRecipeVoteMutation } from '~/data-provider';
import { cn } from '~/utils';

interface RecipeVoteButtonsProps {
  recipeId: string;
  score: number;
  userVote?: number;
  size?: 'sm' | 'lg';
}

export default function RecipeVoteButtons({ recipeId, score, userVote, size = 'sm' }: RecipeVoteButtonsProps) {
  const voteMutation = useRecipeVoteMutation(recipeId);
  const isUp = userVote === 1;
  const isDown = userVote === -1;
  const isLg = size === 'lg';
  const IconUp = isLg ? ThumbsUp : ChevronUp;
  const IconDown = isLg ? ThumbsDown : ChevronDown;
  const iconClass = isLg ? 'h-5 w-5' : 'h-4 w-4';
  const paddingClass = isLg ? 'rounded-lg p-1.5' : 'rounded p-0.5';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => voteMutation.mutate(1)}
        disabled={voteMutation.isPending}
        className={cn(
          paddingClass,
          'transition-colors',
          isUp ? 'text-green-600 dark:text-green-400' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
        aria-label="Like"
      >
        <IconUp className={iconClass} />
      </button>
      <span className={cn('min-w-[1.25rem] text-center font-medium text-text-primary', isLg ? 'text-sm' : 'text-xs')}>
        {score}
      </span>
      <button
        type="button"
        onClick={() => voteMutation.mutate(-1)}
        disabled={voteMutation.isPending}
        className={cn(
          paddingClass,
          'transition-colors',
          isDown ? 'text-red-600 dark:text-red-400' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
        aria-label="Dislike"
      >
        <IconDown className={iconClass} />
      </button>
    </div>
  );
}
