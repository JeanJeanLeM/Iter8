import React from 'react';
import DisplayUsernameMessages from './DisplayUsernameMessages';
import DeleteAccount from './DeleteAccount';
import Avatar from './Avatar';
import EnableTwoFactorItem from './TwoFactorAuthentication';
import BackupCodesItem from './BackupCodesItem';
import { useAuthContext, useLocalize } from '~/hooks';

function Account() {
  const { user } = useAuthContext();
  const localize = useLocalize();

  return (
    <div className="flex flex-col gap-8 p-1 text-sm text-text-primary">
      <section className="flex flex-col gap-6">
        <h3 className="text-base font-semibold text-text-primary">
          {localize('com_nav_account_profile_section')}
        </h3>
        <div className="flex flex-col gap-6">
          <DisplayUsernameMessages />
          <Avatar />
        </div>
      </section>

      {user?.provider === 'local' && (
        <section className="flex flex-col gap-6 border-t border-border-medium pt-6">
          <h3 className="text-base font-semibold text-text-primary">
            {localize('com_nav_account_security_section')}
          </h3>
          <div className="flex flex-col gap-6">
            <EnableTwoFactorItem />
            {user?.twoFactorEnabled && <BackupCodesItem />}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6 border-t border-border-medium pt-6">
        <h3 className="text-base font-semibold text-text-primary">
          {localize('com_nav_account_danger_zone_section')}
        </h3>
        <DeleteAccount />
      </section>
    </div>
  );
}

export default React.memo(Account);
