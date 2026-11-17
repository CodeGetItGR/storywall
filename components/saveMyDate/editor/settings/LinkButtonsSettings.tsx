'use client';

import { useTranslations } from 'next-intl';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemRows } from '@/components/saveMyDate/editor/settings/SettingsItemRows';
import { SettingsItemView } from '@/components/saveMyDate/editor/settings/SettingsItemView';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useLinkButtonsSettings } from '@/hooks/useLinkButtonsSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The section's link buttons: each one's text and link (old action button panel).
export function LinkButtonsSettings({ scope }: { scope: SettingsScope }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const buttons = useLinkButtonsSettings(scope);

    return (
        <SettingsGroup title={t('buttons')}>
            {buttons.item ? (
                /* One button */
                <SettingsItemView title={buttons.item.text.trim() || t('buttonText')} onDone={buttons.close}>
                    <SettingsTextField label={t('buttonText')} value={buttons.item.text} onSave={buttons.setText} maxLength={300} />
                    <SettingsTextField label={t('link')} value={buttons.item.url} onSave={buttons.setUrl} isLink />
                </SettingsItemView>
            ) : (
                /* Buttons */
                <SettingsItemRows rows={buttons.rows} onOpen={buttons.open} />
            )}
        </SettingsGroup>
    );
}
