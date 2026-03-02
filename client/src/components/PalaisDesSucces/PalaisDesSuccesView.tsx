import React from 'react';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useGetGamificationQuery } from '~/data-provider';
import { Spinner } from '@librechat/client';
import { Trophy } from 'lucide-react';
import { cn } from '~/utils';

function formatBadgeLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNextMilestone(count: number, milestones: number[]): number | null {
  const next = milestones.find((m) => m > count);
  return next ?? null;
}

function getReachedMilestones(count: number, milestones: number[]): number[] {
  return milestones.filter((m) => count >= m);
}

export default function PalaisDesSuccesView() {
  const localize = useLocalize();
  const { data, isLoading, isError } = useGetGamificationQuery();

  useDocumentTitle(`${localize('com_ui_palais_des_succes')} | CookIter8`);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-primary">
        <Spinner className="h-8 w-8 text-text-secondary" />
        <p className="text-sm text-text-secondary">{localize('com_ui_loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-primary px-4">
        <p className="text-sm text-text-secondary">{localize('com_ui_gamification_error_loading')}</p>
      </div>
    );
  }

  const { xp, level, badgeCounts, milestones, xpInCurrentLevel, xpNeededForNextLevel } = data;
  const progressPercent =
    xpNeededForNextLevel > 0
      ? Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100)
      : 100;

  const badgeEntries = Object.entries(badgeCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 flex-col gap-4 border-b border-border-medium px-4 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-text-secondary" />
          <h1 className="text-lg font-semibold text-text-primary">
            {localize('com_ui_palais_des_succes')}
          </h1>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border-medium bg-surface-primary-alt p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-secondary">
              {localize('com_ui_gamification_level')}
            </span>
            <span className="text-lg font-semibold text-text-primary">{level}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>{localize('com_ui_gamification_xp')}: {xp}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-primary">
            <div
              className="h-full rounded-full bg-surface-active-alt transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary">
            {xpInCurrentLevel} / {xpNeededForNextLevel} {localize('com_ui_gamification_xp_to_next_level')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          {localize('com_ui_gamification_badges')}
        </h2>
        {badgeEntries.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {localize('com_ui_gamification_no_badges_yet')}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {badgeEntries.map(([badgeKey, count]) => {
              const next = getNextMilestone(count, milestones);
              const reached = getReachedMilestones(count, milestones);
              const progressToNext =
                next != null ? (count / next) * 100 : 100;
              return (
                <li
                  key={badgeKey}
                  className="rounded-lg border border-border-medium bg-surface-primary-alt p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary">
                      {formatBadgeLabel(badgeKey)}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {count} {localize('com_ui_gamification_recipes')}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-primary">
                    <div
                      className="h-full rounded-full bg-surface-active-alt transition-all duration-300"
                      style={{ width: `${Math.min(100, progressToNext)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {milestones.map((m) => (
                      <span
                        key={m}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs font-medium',
                          reached.includes(m)
                            ? 'bg-surface-active-alt text-text-primary'
                            : 'bg-surface-primary text-text-tertiary',
                        )}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
