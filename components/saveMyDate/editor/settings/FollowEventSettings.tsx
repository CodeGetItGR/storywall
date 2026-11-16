'use client';

import { useTranslations } from 'next-intl';

import { SettingsGroup, SettingsHint, SettingsToggle } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useFollowEventSetting } from '@/hooks/useFollowEventSetting';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';

// Whether the section follows the event, and what that means for the host's edits.
export function FollowEventSettings({ scope }: { scope: SettingsScope }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { following, setFollowing } = useFollowEventSetting(scope);

    return (
        <SettingsGroup>
            {/* Switch */}
            <SettingsToggle label={t('followEvent')} checked={following} onChange={setFollowing} />
            {/* Caption */}
            <SettingsHint>{t('followEventHint')}</SettingsHint>
        </SettingsGroup>
    );
}
