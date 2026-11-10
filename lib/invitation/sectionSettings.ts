import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import { hostBackgroundSlots } from '@/lib/invitation/sectionBackgrounds';
import type { EditorMode } from '@/lib/invitation/sectionRules';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';

// The section settings sheet (old section-settings-runtime.js): which groups
// a section shows, and the edits they make as Immer recipes for the editor store.

type DocumentDraft = Draft<InvitationDocument>;
export type DocumentRecipe = (draft: DocumentDraft) => void;

export type SectionData<T extends SectionType> = Extract<InvitationSection, { type: T }>['data'];

export type SettingsGroup =
    | 'date'
    | 'countdown'
    | 'faq'
    | 'rsvp'
    | 'programItems'
    | 'programStyle'
    | 'stays'
    | 'stayBox'
    | 'contact'
    | 'coupleContact'
    | 'locations'
    | 'dressCode'
    | 'buttons'
    | 'footer'
    | 'background'
    | 'effect'
    | 'transition';

const TYPE_GROUPS: Partial<Record<SectionType, SettingsGroup[]>> = {
    date: ['date'],
    countdown: ['countdown'],
    faq: ['faq'],
    rsvp: ['rsvp'],
    program: ['programItems', 'programStyle'],
    programIcons: ['programItems', 'programStyle'],
    accommodation: ['stays', 'stayBox'],
    contact: ['contact'],
    coupleContact: ['coupleContact'],
    locations: ['locations'],
    dressCode: ['dressCode'],
};

// The groups one section's sheet shows, in order. The footer is the admin's
// alone; hosts see a background only when the admin left them a choice.
export function settingsGroups(section: InvitationSection, mode: EditorMode, theme: ThemeDesign): SettingsGroup[] {
    const isAdmin = mode === 'admin';
    if (section.type === 'footer') return isAdmin ? ['footer', 'effect'] : [];
    const groups: SettingsGroup[] = [...(TYPE_GROUPS[section.type] ?? [])];
    if (section.elements.some((element) => element.kind === 'link')) groups.push('buttons');
    if (isAdmin || hostBackgroundSlots(section, theme).length > 0) groups.push('background');
    if (isAdmin) groups.push('effect');
    if (isAdmin && !section.locked && theme.transitions.length > 0) groups.push('transition');
    return groups;
}

export function hasSectionSettings(section: InvitationSection, mode: EditorMode, theme: ThemeDesign): boolean {
    return settingsGroups(section, mode, theme).length > 0;
}

// A change to one section, by id. Nothing happens when it's gone (an undo removed it).
export function editSection(id: string, change: (section: Draft<InvitationSection>) => void): DocumentRecipe {
    return (draft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section) change(section);
    };
}

// A change to the data of one section of a known type.
export function editSectionData<T extends SectionType>(id: string, type: T, change: (data: Draft<SectionData<T>>) => void): DocumentRecipe {
    return editSection(id, (section) => {
        if (section.type === type) change(section.data as Draft<SectionData<T>>);
    });
}

// A style object's change: undefined clears a field, and a style with nothing
// left in it is removed, so the section follows the theme again.
export type StylePatch<T> = { [K in keyof T]?: T[K] | undefined };

export function patchStyle<T extends object>(current: T | undefined, patch: StylePatch<T>): T | undefined {
    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete next[key];
        else next[key] = value;
    }
    return Object.keys(next).length > 0 ? (next as T) : undefined;
}

// Writes a patched optional style field: set, or removed when empty.
export function writeStyle<T extends object, K extends string>(owner: { [P in K]?: T }, key: K, patch: StylePatch<T>) {
    const next = patchStyle(owner[key], patch);
    if (next) owner[key] = next as (typeof owner)[K];
    else delete owner[key];
}

// The merge key for one setting: dragging a colour or typing a size is one undo step.
export function settingMergeKey(sectionId: string, field: string): string {
    return `settings:${sectionId}:${field}`;
}
