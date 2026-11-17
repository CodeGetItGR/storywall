'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ListItem } from '@/lib/invitation/listEdits';

export type PeopleSection = SectionOf<'godparents'> | SectionOf<'weddingSponsors'> | SectionOf<'parentsSimple'>;

// Which list a section holds, and its words: the godparents (with or without photos) or the sponsors.
const PEOPLE = {
    godparents: { list: 'godparents', title: 'godparents', add: 'addGodparent' },
    parentsSimple: { list: 'parentsGodparents', title: 'godparents', add: 'addGodparent' },
    weddingSponsors: { list: 'sponsors', title: 'weddingSponsors', add: 'addSponsor' },
} as const;

type Person = ListItem<'godparents' | 'parentsGodparents' | 'sponsors'>;

// The people of a godparents or sponsors section: rows by name, and the name of the one open.
// Their photos stay on the invitation itself.
export function usePeopleSettings(scope: SettingsScope<PeopleSection>) {
    const t = useTranslations('InvitationEditor');
    const people = PEOPLE[scope.section.type];
    const labelOf = useCallback((person: Person) => person.name.trim() || t('sectionSettings.untitled'), [t]);
    const list = useListSettings(scope, people.list, labelOf);

    return {
        list,
        title: t(`sectionNames.${people.title}`),
        addLabel: t(`sectionSettings.${people.add}`),
        setName: list.fieldSaver('name'),
    };
}
