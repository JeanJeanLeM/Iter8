import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@librechat/client';
import { useLocalize, useDocumentTitle } from '~/hooks';
import { useCompleteOnboardingMutation } from '~/data-provider';
import { HelpCircle, MessageSquare, BookOpen, Calendar, List, Leaf, Settings, RotateCcw } from 'lucide-react';

export default function FAQView() {
  const localize = useLocalize();
  useDocumentTitle(`${localize('com_nav_help_faq')} | CookIter8`);
  const resetOnboardingMutation = useCompleteOnboardingMutation({
    onSuccess: () => {},
  });
  const handleRestartOnboarding = () => {
    resetOnboardingMutation.mutate({ onboardingCompleted: false });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface-primary">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-text-primary">
            {localize('com_faq_title')}
          </h1>
        </div>

        <p className="mb-8 text-text-secondary">
          {localize('com_faq_intro')}
        </p>

        <section className="space-y-8">
          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_assistant_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_assistant_description')}
            </p>
          </article>

          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_recipes_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_recipes_description')}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {localize('com_faq_recipes_save')}
            </p>
          </article>

          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_journal_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_journal_description')}
            </p>
          </article>

          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <List className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_shopping_list_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_shopping_list_description')}
            </p>
          </article>

          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_personalization_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_personalization_description')}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {localize('com_faq_personalization_toggle')}
            </p>
          </article>

          <article className="rounded-xl border border-border-medium bg-surface-primary-alt p-5">
            <div className="mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium text-text-primary">
                {localize('com_faq_settings_title')}
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {localize('com_faq_settings_description')}
            </p>
          </article>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border-medium pt-6">
          <Link
            to="/c/new"
            className="text-sm font-medium text-primary hover:underline"
          >
            {localize('com_faq_back_to_chat')}
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestartOnboarding}
            disabled={resetOnboardingMutation.isLoading}
            className="inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {localize('com_faq_restart_onboarding')}
          </Button>
        </div>
      </div>
    </div>
  );
}
