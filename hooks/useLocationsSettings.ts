'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { placeFieldLock } from '@/lib/invitation/eventLinks';
import { LOCATION_PLACES, setLocationMap } from '@/lib/invitation/sectionSettingsEdits';

// The places the section shows (the welcome only when it's on), each with its map link.
// A place the event has (KAN-84) is changed on the event: its link says where.
export function useLocationsSettings({ section, edit, event, eventFieldLinks }: SettingsScope<SectionOf<'locations'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings.places');
    const { data } = section;

    const places = useMemo(
        () =>
            LOCATION_PLACES.filter((place) => place.key !== 'welcome' || data.welcomeEnabled).map((place) => {
                const lock = placeFieldLock(place.map, event);
                return {
                    map: place.map,
                    title: data[place.key].trim() || t(place.key),
                    value: data[place.map],
                    lock,
                    lockHref: lock ? eventFieldLinks?.[lock] : undefined,
                    save: (url: string) => edit(setLocationMap(section.id, place.map, url)),
                };
            }),
        [data, edit, event, eventFieldLinks, section.id, t],
    );

    return { places };
}
