import React, { useMemo, useState } from 'react';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useGetGamificationQuery } from '~/data-provider';
import { Spinner } from '@librechat/client';
import { ChefHat } from 'lucide-react';
import { cn } from '~/utils';
import { RECIPE_BADGE_OPTIONS, getBadgeColorHue } from '~/constants/gamification';

function formatBadgeLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNextMilestone(count: number, milestones: number[]): number | null {
  const next = milestones.find((m) => m > count);
  return next ?? null;
}

type BadgeEntry = { key: string; label: string; count: number; image?: string };

const CARD_RING_SIZE = 104;
const CARD_RING_STROKE = 6;
const CARD_RING_R = (CARD_RING_SIZE - CARD_RING_STROKE) / 2;
const CARD_RING_CX = CARD_RING_SIZE / 2;
const CARD_RING_CY = CARD_RING_SIZE / 2;
const CARD_RING_CIRCUMFERENCE = 2 * Math.PI * CARD_RING_R;

function ProgressRing({
  progressPercent,
  isComplete,
  size = CARD_RING_SIZE,
  stroke = CARD_RING_STROKE,
  className,
}: {
  progressPercent: number;
  isComplete: boolean;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (circumference * Math.min(100, progressPercent)) / 100;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn('absolute inset-0 h-full w-full -rotate-90', className)}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-border-medium"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        className={cn(
          'transition-all duration-300',
          isComplete ? 'text-amber-500 dark:text-amber-400' : 'text-amber-600 dark:text-amber-500',
        )}
      />
    </svg>
  );
}

export default function PalaisDesSuccesView() {
  const localize = useLocalize();
  const { data, isLoading, isError } = useGetGamificationQuery();

  useDocumentTitle(`${localize('com_ui_collection_des_toques')} | CookIter8`);

  const badgeEntries: BadgeEntry[] = useMemo(() => {
    if (!data) return [];
    const { badgeCounts } = data;
    const predefinedKeys = new Set(RECIPE_BADGE_OPTIONS.map((o) => o.value));
    const list: BadgeEntry[] = RECIPE_BADGE_OPTIONS.map((o) => ({
      key: o.value,
      label: localize(o.labelKey),
      count: badgeCounts[o.value] ?? 0,
      image: o.image,
    }));
    const others = Object.entries(badgeCounts)
      .filter(([key]) => !predefinedKeys.has(key))
      .sort(([, a], [, b]) => b - a)
      .map(([key]) => ({
        key,
        label: formatBadgeLabel(key),
        count: badgeCounts[key],
      }));
    return [...list, ...others];
  }, [data, localize]);

  const [viewFilter, setViewFilter] = useState<'accomplis' | 'en_cours'>('en_cours');

  const firstMilestone = data?.milestones?.[0] ?? 1;
  const filteredEntries = useMemo(() => {
    if (!badgeEntries.length) return [];
    const first = data?.milestones?.[0] ?? 1;
    if (viewFilter === 'accomplis') {
      return badgeEntries.filter((e) => e.count >= first);
    }
    return badgeEntries.filter((e) => e.count < first);
  }, [badgeEntries, viewFilter, data?.milestones]);

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

  const { xp, level, milestones, xpInCurrentLevel, xpNeededForNextLevel } = data;
  const progressPercent =
    xpNeededForNextLevel > 0
      ? Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100)
      : 100;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 flex-col gap-4 border-b border-border-medium px-4 py-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 shrink-0 text-text-secondary" />
          <h1 className="text-lg font-semibold text-text-primary">
            {localize('com_ui_collection_des_toques')}
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
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">
            {localize('com_ui_gamification_toques_by_type')}
          </h2>
          <div
            role="tablist"
            className="inline-flex rounded-lg border border-border-medium bg-surface-primary-alt p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === 'en_cours'}
              onClick={() => setViewFilter('en_cours')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewFilter === 'en_cours'
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_gamification_filter_in_progress')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === 'accomplis'}
              onClick={() => setViewFilter('accomplis')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewFilter === 'accomplis'
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_gamification_filter_accomplished')}
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-text-secondary">
          {localize('com_ui_gamification_toques_hint')}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredEntries.map(({ key: badgeKey, label, count, image }) => {
            const next = getNextMilestone(count, milestones);
            const progressToNext = next != null ? (count / next) * 100 : 100;
            const isComplete = next == null;
            const currentTarget = next ?? (count > 0 ? count : firstMilestone);
            const hue = getBadgeColorHue(badgeKey);
            return (
              <article
                key={badgeKey}
                className="flex flex-col items-center rounded-xl border border-border-medium bg-surface-primary-alt p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="relative flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: CARD_RING_SIZE,
                    height: CARD_RING_SIZE,
                  }}
                >
                  <ProgressRing
                    progressPercent={progressToNext}
                    isComplete={isComplete}
                    size={CARD_RING_SIZE}
                    stroke={CARD_RING_STROKE}
                  />
                  <div
                    className="absolute rounded-full overflow-hidden"
                    style={{
                      inset: CARD_RING_STROKE,
                      width: CARD_RING_SIZE - CARD_RING_STROKE * 2,
                      height: CARD_RING_SIZE - CARD_RING_STROKE * 2,
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background: `hsl(${hue}, 45%, 92%)`,
                          color: `hsl(${hue}, 50%, 35%)`,
                        }}
                      >
                        <ChefHat className="h-10 w-10" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 w-full min-w-0 text-center">
                  <h3 className="truncate font-medium text-text-primary">
                    {label}
                  </h3>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {count} / {currentTarget} {localize('com_ui_gamification_recipes')}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        {filteredEntries.length === 0 && (
          <p className="text-sm text-text-secondary">
            {viewFilter === 'accomplis'
              ? localize('com_ui_gamification_no_badges_yet')
              : localize('com_ui_gamification_toques_hint')}
          </p>
        )}
      </div>
    </div>
  );
}
