import { useParams } from 'react-router-dom';
import { TooltipAnchor, Switch } from '@librechat/client';
import { Constants, SettingsTabValues } from 'librechat-data-provider';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useUpdateConversationDietaryPreferencesMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

const index = 0;

export default function DietaryPreferencesButton() {
  const localize = useLocalize();
  const { conversationId } = useParams();
  const conversation = useRecoilValue(store.conversationByIndex(index));
  const setConversation = useSetRecoilState(store.conversationByIndex(index));
  const setOpenSettingsWithTab = useSetRecoilState(store.openSettingsWithTab);
  const updateDietaryPrefs = useUpdateConversationDietaryPreferencesMutation(conversationId ?? '');

  const isNewConvo = !conversationId || conversationId === Constants.NEW_CONVO;
  const useDietaryPreferences = conversation?.useDietaryPreferences !== false;

  const handleCheckedChange = (checked: boolean) => {
    if (isNewConvo) {
      setConversation((prev) => (prev ? { ...prev, useDietaryPreferences: checked } : prev));
      return;
    }
    updateDietaryPrefs.mutate(checked, {
      onSuccess: (updatedConvo) => {
        setConversation((prev) =>
          prev?.conversationId === updatedConvo.conversationId
            ? { ...prev, useDietaryPreferences: updatedConvo.useDietaryPreferences }
            : prev,
        );
      },
    });
  };

  const label = useDietaryPreferences
    ? localize('com_ui_dietary_preferences_button_on')
    : localize('com_ui_dietary_preferences_button_off');
  const description = isNewConvo
    ? localize('com_ui_dietary_preferences_hover_new')
    : useDietaryPreferences
      ? localize('com_ui_dietary_preferences_hover_on')
      : localize('com_ui_dietary_preferences_hover_off');

  return (
    <TooltipAnchor
      aria-label={label}
      description={description}
      render={
        <div className="my-1 flex h-10 items-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenSettingsWithTab(SettingsTabValues.PERSONALIZATION);
            }}
            className="whitespace-nowrap text-sm text-text-primary underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
            aria-label={localize('com_ui_dietary_preferences_open_settings')}
          >
            {localize('com_ui_dietary_preferences_label')}
          </button>
          <Switch
            id="dietary-preferences-switch"
            checked={useDietaryPreferences}
            onCheckedChange={handleCheckedChange}
            disabled={updateDietaryPrefs.isLoading}
            aria-label={label}
            data-testid="dietary-preferences-switch"
          />
          <span className="min-w-[2rem] text-sm font-medium text-text-primary" aria-hidden="true">
            {useDietaryPreferences ? 'ON' : 'OFF'}
          </span>
        </div>
      }
    />
  );
}
