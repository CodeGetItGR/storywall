import type { Draft } from 'immer';

import type { ContactLinkKey } from '@/lib/invitation/contactLinks';
import { applyDateLanguage, type DateLanguage } from '@/lib/invitation/dateDisplay';
import { DATE_DISPLAY_STYLES, type InvitationSection, type SectionType } from '@/lib/invitation/sections';
import { type DocumentRecipe, editSection, editSectionData, type SectionData, type StylePatch, writeStyle } from '@/lib/invitation/sectionSettings';
import { upgradeProgramStyle } from '@/lib/invitation/sectionStyleFields';

// The edits each section's own settings make (old section-settings-runtime.js).
// Every one is an Immer recipe that does nothing when the section is gone.

export type DateLayout = (typeof DATE_DISPLAY_STYLES)[number];

export function setDateLayout(id: string, layout: DateLayout): DocumentRecipe {
    return editSectionData(id, 'date', (data) => {
        data.displayStyle = layout;
    });
}

export function setDateLanguage(id: string, language: DateLanguage): DocumentRecipe {
    return editSectionData(id, 'date', (data) => {
        if (data.displayLanguage === language) return;
        applyDateLanguage(data, language);
    });
}

// The style objects the style groups edit, by section type.
type StyleOwners = {
    countdown: 'numberStyle';
    faq: 'faqStyle';
    rsvp: 'formStyle';
    program: 'programStyle';
    programIcons: 'programStyle';
    accommodation: 'cardStyle';
    contact: 'iconStyle';
    coupleContact: 'iconStyle';
};

export type StyledSectionType = keyof StyleOwners;

export const STYLE_KEYS: { [T in StyledSectionType]: StyleOwners[T] } = {
    countdown: 'numberStyle',
    faq: 'faqStyle',
    rsvp: 'formStyle',
    program: 'programStyle',
    programIcons: 'programStyle',
    accommodation: 'cardStyle',
    contact: 'iconStyle',
    coupleContact: 'iconStyle',
};

export type SectionStyleValues<T extends StyledSectionType> = NonNullable<SectionData<T>[StyleOwners[T] & keyof SectionData<T>]>;

export function isStyledSection(type: SectionType): type is StyledSectionType {
    return Object.hasOwn(STYLE_KEYS, type);
}

// The style object of a styled section, as stored.
export function sectionStyleValues(section: InvitationSection): Record<string, unknown> | undefined {
    if (!isStyledSection(section.type)) return undefined;
    const data = section.data as Record<string, unknown>;
    return data[STYLE_KEYS[section.type]] as Record<string, unknown> | undefined;
}

// One change to a section's style object. A program's older shared font and
// size are moved to the time and text fields first, as the old panel did on save.
export function patchSectionStyle(id: string, patch: StylePatch<Record<string, unknown>>): DocumentRecipe {
    return editSection(id, (section) => {
        if (!isStyledSection(section.type)) return;
        const data = section.data as Record<string, unknown>;
        const key = STYLE_KEYS[section.type];
        if (section.type === 'program' || section.type === 'programIcons') {
            const upgraded = upgradeProgramStyle(data[key] as SectionStyleValues<'program'> | undefined);
            if (upgraded) data[key] = upgraded;
        }
        writeStyle(data as Record<string, Record<string, unknown> | undefined>, key, patch);
    });
}

// Program moments.

export const MAX_PROGRAM_ITEMS = 50;

type ProgramItem = SectionData<'programIcons'>['items'][number];
export type ProgramItemPatch = Partial<Omit<ProgramItem, 'id'>>;

// A new empty moment at the end; `itemId` is made by the caller so it can be opened next.
export function addProgramItem(id: string, itemId: string): DocumentRecipe {
    return editSection(id, (section) => {
        if (section.type === 'programIcons') {
            if (section.data.items.length < MAX_PROGRAM_ITEMS)
                section.data.items.push({ id: itemId, time: '', label: '', description: '', icon: { kind: 'auto' } });
        } else if (section.type === 'program') {
            if (section.data.items.length < MAX_PROGRAM_ITEMS) section.data.items.push({ id: itemId, time: '', label: '' });
        }
    });
}

export function updateProgramItem(id: string, itemId: string, patch: ProgramItemPatch): DocumentRecipe {
    return editSection(id, (section) => {
        if (section.type !== 'program' && section.type !== 'programIcons') return;
        const item = (section.data.items as Draft<ProgramItem>[]).find((entry) => entry.id === itemId);
        if (!item) return;
        const { description, icon, ...shared } = patch;
        Object.assign(item, shared);
        if (section.type !== 'programIcons') return;
        if (description !== undefined) item.description = description;
        if (icon !== undefined) item.icon = icon;
    });
}

// Removes a moment and the text styles kept under it.
export function deleteProgramItem(id: string, itemId: string): DocumentRecipe {
    return editSection(id, (section) => {
        if (section.type !== 'program' && section.type !== 'programIcons') return;
        const items = section.data.items as { id: string }[];
        const index = items.findIndex((item) => item.id === itemId);
        if (index === -1) return;
        items.splice(index, 1);
        removeTextStyles(section, `items.${itemId}.`);
    });
}

function removeTextStyles(section: Draft<InvitationSection>, prefix: string) {
    for (const path of Object.keys(section.textStyles)) {
        if (path.startsWith(prefix)) delete section.textStyles[path];
    }
}

// Places to stay: their two links.
export type StayLinks = { website?: string; mapUrl?: string };

export function setStayLinks(id: string, itemId: string, links: StayLinks): DocumentRecipe {
    return editSectionData(id, 'accommodation', (data) => {
        const item = data.items.find((entry) => entry.id === itemId);
        if (item) Object.assign(item, links);
    });
}

// Contact links, of the contact section or one partner of the couple contact.
export function setContactLink(id: string, key: ContactLinkKey, value: string): DocumentRecipe {
    return editSectionData(id, 'contact', (data) => {
        data[key] = value;
    });
}

export type Partner = 'partnerA' | 'partnerB';

export function setPartnerContactLink(id: string, partner: Partner, key: ContactLinkKey, value: string): DocumentRecipe {
    return editSectionData(id, 'coupleContact', (data) => {
        data[partner][key] = value;
    });
}

// The three places of the locations section and their map links.
export const LOCATION_PLACES = [
    { key: 'ceremony', map: 'ceremonyMap' },
    { key: 'welcome', map: 'welcomeMap' },
    { key: 'reception', map: 'receptionMap' },
] as const;

export type LocationMapKey = (typeof LOCATION_PLACES)[number]['map'];

export function setLocationMap(id: string, key: LocationMapKey, url: string): DocumentRecipe {
    return editSectionData(id, 'locations', (data) => {
        data[key] = url;
    });
}

// Dress code colours.
export const MAX_DRESS_CODE_COLORS = 12;

export function addDressCodeColor(id: string, color: string): DocumentRecipe {
    return editSectionData(id, 'dressCode', (data) => {
        if (data.colors.length < MAX_DRESS_CODE_COLORS) data.colors.push(color);
    });
}

export function setDressCodeColor(id: string, index: number, color: string): DocumentRecipe {
    return editSectionData(id, 'dressCode', (data) => {
        if (index >= 0 && index < data.colors.length) data.colors[index] = color;
    });
}

export function removeDressCodeColor(id: string, index: number): DocumentRecipe {
    return editSectionData(id, 'dressCode', (data) => {
        if (index >= 0 && index < data.colors.length) data.colors.splice(index, 1);
    });
}

// A section's link buttons.
export type LinkButtonPatch = { text?: string; url?: string };

export function setLinkButton(id: string, elementId: string, patch: LinkButtonPatch): DocumentRecipe {
    return editSection(id, (section) => {
        const element = section.elements.find((item) => item.id === elementId);
        if (element?.kind === 'link') Object.assign(element, patch);
    });
}

// The footer (admin).
export type FooterPatch = StylePatch<Pick<SectionData<'footer'>, 'font' | 'textColor'>> & { link?: string };

export function patchFooter(id: string, patch: FooterPatch): DocumentRecipe {
    return editSectionData(id, 'footer', (data) => {
        for (const [key, value] of Object.entries(patch) as [keyof FooterPatch, string | undefined][]) {
            if (key === 'link') data.link = value ?? '';
            else if (value === undefined) delete data[key];
            else data[key] = value;
        }
    });
}
