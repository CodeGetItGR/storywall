'use client';

import { type ChangeEvent, useCallback } from 'react';

import { useProgramIconUpload } from '@/hooks/useProgramIconUpload';
import type { ProgramSection } from '@/hooks/useProgramItemsSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { type ProgramIconKey, programIconKeyForLabel } from '@/lib/invitation/programIcons';
import type { CustomProgramIcon } from '@/lib/invitation/programIconUpload';
import { PROGRAM_ICONS } from '@/lib/invitation/sections';
import type { SectionData } from '@/lib/invitation/sectionSettings';
import type { ProgramItemPatch } from '@/lib/invitation/sectionSettingsEdits';

type ProgramIcon = SectionData<'programIcons'>['items'][number]['icon'];
type IconItem = SectionData<'programIcons'>['items'][number];

// The select's value for each icon choice.
export type IconChoice = 'auto' | 'none' | 'custom' | ProgramIconKey;

export function iconChoice(icon: ProgramIcon): IconChoice {
    return icon.kind === 'preset' ? icon.key : icon.kind;
}

function iconFor(choice: IconChoice): ProgramIcon | null {
    if (choice === 'auto' || choice === 'none') return { kind: choice };
    if (choice === 'custom') return null;
    return (PROGRAM_ICONS as readonly string[]).includes(choice) ? { kind: 'preset', key: choice } : null;
}

// A moment's icon: automatic, none, a built-in one or (admins) an uploaded one.
export function useProgramIconField(
    scope: SettingsScope<ProgramSection>,
    item: IconItem,
    onChange: (itemId: string, patch: ProgramItemPatch) => void,
) {
    const { isAdmin, media, addUploaded, draftId } = scope;
    const setIcon = useCallback((icon: ProgramIcon) => onChange(item.id, { icon }), [item.id, onChange]);

    const onUploaded = useCallback(
        (icon: CustomProgramIcon, url: string, mediaId: string) => {
            addUploaded(mediaId, url);
            setIcon(icon);
        },
        [addUploaded, setIcon],
    );
    const upload = useProgramIconUpload(draftId, onUploaded);

    const onSelect = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const icon = iconFor(event.target.value as IconChoice);
            if (icon) setIcon(icon);
        },
        [setIcon],
    );
    const removeCustom = useCallback(() => setIcon({ kind: 'auto' }), [setIcon]);

    const { icon } = item;
    const preview: ProgramIconKey | null = icon.kind === 'preset' ? icon.key : icon.kind === 'auto' ? programIconKeyForLabel(item.label) : null;
    const customSrc = icon.kind === 'custom' && icon.image.source === 'media' ? media(icon.image.mediaId) : undefined;

    return {
        choice: iconChoice(icon),
        presets: PROGRAM_ICONS,
        // The uploaded choice is listed only while a row has one.
        showsCustomChoice: icon.kind === 'custom',
        canUpload: isAdmin,
        preview,
        customSrc,
        onSelect,
        removeCustom,
        upload,
    };
}
