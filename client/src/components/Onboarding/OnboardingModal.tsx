import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@librechat/client';
import { useCompleteOnboardingMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { X } from 'lucide-react';

const ONBOARDING_P1_STEP1_IMAGE = '/assets/onboarding/p1step1.png';
const ONBOARDING_P1_STEP2_VIDEO = '/assets/onboarding/Page1Step2.mp4';
const ONBOARDING_P1_STEP3_VIDEO = '/assets/onboarding/Page1Step3.mp4';
const ONBOARDING_P1_STEP4_VIDEO = '/assets/onboarding/Page1Step4.mp4';
const ONBOARDING_P2_STEP1_IMAGE = '/assets/onboarding/P2Step1.png';
const ONBOARDING_P3_STEP1_IMAGE = '/assets/onboarding/P3Step1.png';

const P1_STEPS = 4;
const TOTAL_STEPS = 6; // P1 (4 steps) + P2 (1 step) + P3 (1 step)

const STEP_VIDEOS = [
  ONBOARDING_P1_STEP2_VIDEO,
  ONBOARDING_P1_STEP3_VIDEO,
  ONBOARDING_P1_STEP4_VIDEO,
] as const;
const PAGE_TITLE_KEYS = [
  'com_onboarding_p1_title',
  'com_onboarding_p1_title',
  'com_onboarding_p1_title',
  'com_onboarding_p1_title',
  'com_onboarding_p2_title',
  'com_onboarding_p3_title',
] as const;
const STEP_TITLE_KEYS = [
  'com_onboarding_p1_step1_title',
  'com_onboarding_p1_step2_title',
  'com_onboarding_p1_step3_title',
  'com_onboarding_p1_step4_title',
  'com_onboarding_p2_step1_title',
  'com_onboarding_p3_step1_title',
] as const;
const STEP_BODY_KEYS = [
  'com_onboarding_p1_step1_body',
  'com_onboarding_p1_step2_body',
  'com_onboarding_p1_step3_body',
  'com_onboarding_p1_step4_body',
  'com_onboarding_p2_step1_body',
  'com_onboarding_p3_step1_body',
] as const;

export default function OnboardingModal({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const localize = useLocalize();
  const [currentStep, setCurrentStep] = useState(0);
  const completeOnboardingMutation = useCompleteOnboardingMutation({
    onSuccess: () => {
      onComplete();
    },
  });

  const handleClose = () => {
    completeOnboardingMutation.mutate({ onboardingCompleted: true });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboardingMutation.mutate({ onboardingCompleted: true });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!open) {
    return null;
  }

  const pageTitleKey = PAGE_TITLE_KEYS[currentStep] ?? PAGE_TITLE_KEYS[0];
  const stepTitleKey = STEP_TITLE_KEYS[currentStep] ?? STEP_TITLE_KEYS[0];
  const stepBodyKey = STEP_BODY_KEYS[currentStep] ?? STEP_BODY_KEYS[0];

  const isP2Step1 = currentStep === P1_STEPS; // step 4 (0-based)
  const isP3Step1 = currentStep === P1_STEPS + 1; // step 5 (0-based)
  const mediaContent = isP3Step1 ? (
    <img
      src={ONBOARDING_P3_STEP1_IMAGE}
      alt=""
      className="max-h-full w-full max-w-4xl object-contain object-center"
    />
  ) : isP2Step1 ? (
    <img
      src={ONBOARDING_P2_STEP1_IMAGE}
      alt=""
      className="max-h-full w-full max-w-4xl object-contain object-center"
    />
  ) : currentStep === 0 ? (
    <img
      src={ONBOARDING_P1_STEP1_IMAGE}
      alt=""
      className="max-h-full w-full max-w-4xl object-contain object-center"
    />
  ) : (
    <video
      src={STEP_VIDEOS[currentStep - 1]}
      className="max-h-full w-full max-w-4xl object-contain object-center"
      autoPlay
      loop
      muted
      playsInline
      controls
      aria-label=""
    />
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-surface-primary"
      role="dialog"
      aria-modal="true"
      aria-label={localize(pageTitleKey)}
    >
      {/* Header: close button top right */}
      <header className="flex shrink-0 justify-end p-4">
        <button
          type="button"
          onClick={handleClose}
          disabled={completeOnboardingMutation.isLoading}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-active hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50"
          aria-label={localize('com_ui_close')}
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      </header>

      {/* Title above media */}
      <div className="shrink-0 px-6 pt-2 pb-2 md:px-8">
        <h2 className="text-lg font-semibold text-text-primary md:text-xl">
          {localize(pageTitleKey)}
        </h2>
      </div>

      {/* Main: 2/3 media above, 1/3 explanation below (always vertical) */}
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-[2] items-center justify-center bg-surface-primary-alt p-4 md:p-6">
          {mediaContent}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-6 md:px-8 md:py-8">
          <h3 className="text-base font-medium text-text-primary md:text-lg">
            {localize(stepTitleKey)}
          </h3>
          <p className="mt-3 text-sm text-text-secondary md:text-base">
            {localize(stepBodyKey)}
          </p>
        </div>
      </main>

      {/* Footer: Précédent | Suivant */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border-medium bg-surface-primary px-6 py-4">
        <div className="w-24">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevious}
              disabled={completeOnboardingMutation.isLoading}
              className="min-w-[100px]"
            >
              {localize('com_onboarding_previous')}
            </Button>
          )}
        </div>
        <Button
          type="button"
          onClick={handleNext}
          disabled={completeOnboardingMutation.isLoading}
          className="min-w-[120px]"
        >
          {localize('com_onboarding_next')}
        </Button>
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
}
