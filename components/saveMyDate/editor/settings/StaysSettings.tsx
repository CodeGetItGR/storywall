'use client';

import { useTranslations } from 'next-intl';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemRows } from '@/components/saveMyDate/editor/settings/SettingsItemRows';
import { SettingsItemView } from '@/components/saveMyDate/editor/settings/SettingsItemView';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useStaysSettings } from '@/hooks/useStaysSettings';

// Each place to stay's website and map link (old stays panel).
export function StaysSettings({ scope }: { scope: SettingsScope<SectionOf<'accommodation'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const stays = useStaysSettings(scope);

    if (stays.rows.length === 0) return null;

    return (
        <SettingsGroup title={t('stays')}>
            {stays.item ? (
                /* One place */
                <SettingsItemView title={stays.itemTitle} onDone={stays.close}>
                    <SettingsTextField label={t('website')} value={stays.item.website} onSave={stays.setWebsite} isLink />
                    <SettingsTextField label={t('mapLink')} value={stays.item.mapUrl} onSave={stays.setMap} isLink hint={t('mapHint')} />
                </SettingsItemView>
            ) : (
                /* Places */
                <SettingsItemRows rows={stays.rows} onOpen={stays.open} />
            )}
        </SettingsGroup>
    );
}
