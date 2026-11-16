'use client';

import { useTranslations } from 'next-intl';

import { EventLockNote } from '@/components/saveMyDate/editor/EventLockNote';
import { SettingsGroup, SettingsToggle } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useLocationsSettings } from '@/hooks/useLocationsSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// Whether the welcome place shows, then each place's Google Maps link under the place's own name
// (old location map panel).
export function LocationsSettings({ scope }: { scope: SettingsScope<SectionOf<'locations'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const locations = useLocationsSettings(scope);

    return (
        <>
            {/* Welcome */}
            <SettingsGroup>
                <SettingsToggle label={t('showWelcome')} checked={locations.welcome} onChange={locations.setWelcome} />
            </SettingsGroup>

            {/* Places */}
            {locations.places.map((place) => (
                <SettingsGroup key={place.map} title={place.title}>
                    {place.lock ? (
                        /* From the event */
                        <EventLockNote source={place.lock} href={place.lockHref} />
                    ) : (
                        /* Map link */
                        <SettingsTextField label={t('mapLink')} value={place.value} onSave={place.save} isLink hint={t('mapHint')} />
                    )}
                </SettingsGroup>
            ))}
        </>
    );
}
