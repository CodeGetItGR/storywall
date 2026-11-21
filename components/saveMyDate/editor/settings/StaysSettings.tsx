'use client';

import { useTranslations } from 'next-intl';

import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useStaysSettings } from '@/hooks/useStaysSettings';

// The places to stay (old stays panel): rows, and one place's details and links at a time.
export function StaysSettings({ scope }: { scope: SettingsScope<SectionOf<'accommodation'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const stays = useStaysSettings(scope);
    const { item } = stays.list;

    return (
        <SettingsList title={t('stays')} addLabel={t('addStay')} list={stays.list}>
            {item && (
                <>
                    {/* Details */}
                    <SettingsTextField label={t('name')} value={item.name} onSave={stays.setName} />
                    <SettingsTextField label={t('address')} value={item.address} onSave={stays.setAddress} />

                    {/* Contact */}
                    <SettingsTextField label={t('contactLinks.phone')} value={item.phone} onSave={stays.setPhone} type="tel" maxLength={300} />
                    <SettingsTextField label={t('contactLinks.email')} value={item.email} onSave={stays.setEmail} type="email" maxLength={300} />

                    {/* Links */}
                    <SettingsTextField label={t('website')} value={item.website} onSave={stays.setWebsite} isLink />
                    <SettingsTextField label={t('mapLink')} value={item.mapUrl} onSave={stays.setMap} isLink hint={t('mapHint')} />
                </>
            )}
        </SettingsList>
    );
}
