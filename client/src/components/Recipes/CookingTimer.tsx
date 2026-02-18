import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@librechat/client';
import { Play, Pause, RotateCcw, Square } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
    // Repeat a few times for noticeable alarm
    [1.2, 2.4, 3.6].forEach((t) => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 800;
      o2.type = 'sine';
      g2.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.8);
      o2.start(ctx.currentTime + t);
      o2.stop(ctx.currentTime + t + 0.8);
    });
  } catch {
    // Fallback: no sound if AudioContext unavailable
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type TimerState = 'idle' | 'running' | 'paused';

interface CookingTimerProps {
  /** Default duration in minutes. Used when step has durationMinutes or as fallback. */
  defaultDurationMinutes?: number;
  /** Called when step changes to reset timer with new default. */
  stepKey?: string | number;
  className?: string;
}

export default function CookingTimer({
  defaultDurationMinutes = 5,
  stepKey,
  className,
}: CookingTimerProps) {
  const localize = useLocalize();
  const defaultSeconds = Math.max(1, Math.round(defaultDurationMinutes * 60));
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [state, setState] = useState<TimerState>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAlarmedRef = useRef(false);

  const resetToDuration = useCallback((duration: number) => {
    const sec = Math.max(1, Math.round(duration));
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setState('idle');
    hasAlarmedRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const sec = Math.max(1, Math.round(defaultDurationMinutes * 60));
    resetToDuration(sec);
  }, [stepKey, defaultDurationMinutes, resetToDuration]);

  useEffect(() => {
    if (state !== 'running') return;
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setState('idle');
          if (!hasAlarmedRef.current) {
            hasAlarmedRef.current = true;
            playAlarm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state]);

  const canEdit = state === 'idle' || state === 'paused';
  const handleMinutesChange = (v: number) => {
    if (!canEdit) return;
    const m = Math.max(0, Math.min(99, Math.floor(v)));
    const currentSec = state === 'paused' ? remainingSeconds : totalSeconds;
    const s = currentSec % 60;
    const newVal = m * 60 + s || 60;
    setTotalSeconds(newVal);
    setRemainingSeconds(newVal);
  };
  const handleSecondsChange = (v: number) => {
    if (!canEdit) return;
    const s = Math.max(0, Math.min(59, Math.floor(v)));
    const currentSec = state === 'paused' ? remainingSeconds : totalSeconds;
    const m = Math.floor(currentSec / 60);
    const newVal = m * 60 + s || 60;
    setTotalSeconds(newVal);
    setRemainingSeconds(newVal);
  };

  const start = () => {
    hasAlarmedRef.current = false;
    setState('running');
  };
  const pause = () => setState('paused');
  const restart = () => {
    setRemainingSeconds(totalSeconds);
    hasAlarmedRef.current = false;
    setState('running');
  };
  const stop = () => resetToDuration(totalSeconds);

  const displayM = Math.floor((state === 'running' || state === 'paused' ? remainingSeconds : totalSeconds) / 60);
  const displayS = (state === 'running' || state === 'paused' ? remainingSeconds : totalSeconds) % 60;

  const btnClass = 'flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 px-4 py-3 text-base sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1.5 sm:text-sm';

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border-medium bg-surface-primary-alt p-4 sm:gap-3 sm:p-4',
        className,
      )}
    >
      <h3 className="text-sm font-medium text-text-secondary">
        {localize('com_ui_recipe_timer')}
      </h3>
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {canEdit ? (
          <div className="flex items-center gap-2 text-3xl font-mono tabular-nums text-text-primary sm:text-2xl">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={displayM}
              onChange={(e) => handleMinutesChange(Number(e.target.value) || 0)}
              className="min-h-[52px] w-16 rounded-lg border border-border-medium bg-surface-primary px-2 py-2 text-center text-2xl [font-size:1.25rem] sm:min-h-0 sm:w-12 sm:py-1 sm:text-xl"
              aria-label={localize('com_ui_recipe_timer_minutes')}
            />
            <span className="text-text-secondary">:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={displayS}
              onChange={(e) => handleSecondsChange(Number(e.target.value) || 0)}
              className="min-h-[52px] w-16 rounded-lg border border-border-medium bg-surface-primary px-2 py-2 text-center text-2xl [font-size:1.25rem] sm:min-h-0 sm:w-12 sm:py-1 sm:text-xl"
              aria-label={localize('com_ui_recipe_timer_seconds')}
            />
          </div>
        ) : (
          <span className="text-4xl font-mono tabular-nums text-text-primary sm:text-2xl">
            {formatTime(remainingSeconds)}
          </span>
        )}
        <div className="flex flex-wrap gap-3 sm:gap-2">
          {state === 'idle' && (
            <Button
              type="button"
              variant="default"
              onClick={start}
              className={btnClass}
            >
              <Play className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
              {localize('com_ui_recipe_timer_start')}
            </Button>
          )}
          {state === 'running' && (
            <>
              <Button type="button" variant="outline" onClick={pause} className={btnClass}>
                <Pause className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_pause')}
              </Button>
              <Button type="button" variant="outline" onClick={restart} className={btnClass}>
                <RotateCcw className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_restart')}
              </Button>
              <Button type="button" variant="outline" onClick={stop} className={btnClass}>
                <Square className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_stop')}
              </Button>
            </>
          )}
          {state === 'paused' && (
            <>
              <Button
                type="button"
                variant="default"
                onClick={start}
                className={btnClass}
              >
                <Play className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_start')}
              </Button>
              <Button type="button" variant="outline" onClick={restart} className={btnClass}>
                <RotateCcw className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_restart')}
              </Button>
              <Button type="button" variant="outline" onClick={stop} className={btnClass}>
                <Square className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {localize('com_ui_recipe_timer_stop')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
