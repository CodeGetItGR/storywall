'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { LOCATION_PLACES, setLocationMap } from '@/lib/invitation/sectionSettingsEdits';

// The places the section shows (the welcome only when it's on), each with its map link.
export function useLocationsSettings({ section, edit }: SettingsScope<SectionOf<'locations'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings.places');
    const { data } = section;

    const places = useMemo(
        () =>
            LOCATION_PLACES.filter((place) => place.key !== 'welcome' || data.welcomeEnabled).map((place) => ({
                map: place.map,
                title: data[place.key].trim() || t(place.key),
                value: data[place.map],
                save: (url: string) => edit(setLocationMap(section.id, place.map, url)),
            })),
        [data, edit, section.id, t],
    );

    return { places };
}
