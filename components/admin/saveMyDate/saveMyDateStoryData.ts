import { http, HttpResponse } from 'msw';

import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';
import type { AdminThemeFontDto } from '@/lib/api/types';

// Fixtures for the Save my date fonts, font pairings and texts stories.

// A real font file for every uploaded font, so the table, the drawer and the pairing preview show a face
// rather than a failed load. Vite bundles it, so it works in a built Storybook too.
const STORY_FONT_FILE = new URL('../../saveMyDate/invitation/fonts/SourceSerifPro-Regular.woff', import.meta.url).href;

export const storyFontFileHandlers = [
    http.get('*/api/theme-fonts/:key/:file', async () => {
        const bytes = await (await fetch(STORY_FONT_FILE)).arrayBuffer();
        return new HttpResponse(bytes, { headers: { 'Content-Type': 'font/woff' } });
    }),
];

export function storyInvitationFont(overrides: Partial<AdminThemeFontDto> = {}): AdminThemeFontDto {
    return {
        id: 'font-1',
        key: 'theos',
        familyName: 'Theos',
        fallback: 'serif',
        library: 'INVITATION',
        archived: false,
        url: '/api/theme-fonts/theos/1.woff2',
        presetCount: 0,
        invitationEventTypes: ['BAPTISM', 'WEDDING'],
        ...overrides,
    };
}

export const storyInvitationFonts: AdminThemeFontDto[] = [
    storyInvitationFont(),
    storyInvitationFont({ id: 'font-2', key: 'kalligrafia', familyName: 'Kalligrafia', invitationEventTypes: [] }),
    storyInvitationFont({ id: 'font-3', key: 'paidiki', familyName: 'Paidiki', fallback: 'sans-serif', url: null, invitationEventTypes: ['BIRTHDAY'] }),
    storyInvitationFont({ id: 'font-4', key: 'palia', familyName: 'Palia', archived: true, invitationEventTypes: [] }),
];

// The renderer's view of the same fonts (/api/invitation-fonts/files), for the pairing preview.
export const storyInvitationFontFiles = storyInvitationFonts
    .filter((font) => font.url)
    .map((font) => ({ key: font.key, familyName: font.familyName, fallback: font.fallback, url: font.url }));

export function storyFontPairing(overrides: Partial<AdminFontPairingDto> = {}): AdminFontPairingDto {
    return {
        id: 'pairing-1',
        name: 'Κλασικό',
        titleFont: "'Playfair Display',serif",
        bodyFont: 'Lora,serif',
        buttonFont: null,
        hidden: false,
        sortOrder: 0,
        eventTypes: [],
        ...overrides,
    };
}

export const storyFontPairings: AdminFontPairingDto[] = [
    storyFontPairing(),
    storyFontPairing({ id: 'pairing-2', name: 'Ρομαντικό', titleFont: "'Theos',serif", bodyFont: "'Cormorant Garamond',serif", buttonFont: 'Cinzel,serif', sortOrder: 1, eventTypes: ['WEDDING'] }),
    storyFontPairing({ id: 'pairing-3', name: 'Παιδικό', titleFont: 'Comfortaa,sans-serif', bodyFont: 'Raleway,sans-serif', hidden: true, sortOrder: 2, eventTypes: ['BAPTISM', 'BIRTHDAY'] }),
];

export function storyInvitationText(overrides: Partial<AdminInvitationTextDto> = {}): AdminInvitationTextDto {
    return {
        id: 'text-1',
        eventType: 'WEDDING',
        language: 'el',
        label: 'Επίσημο',
        body: 'Με μεγάλη χαρά σας προσκαλούμε\nστον γάμο μας.',
        sortOrder: 0,
        ...overrides,
    };
}

export const storyInvitationTexts: AdminInvitationTextDto[] = [
    storyInvitationText(),
    storyInvitationText({ id: 'text-4', label: 'Απλό', body: 'Παντρευόμαστε!\nΘα χαρούμε να είστε εκεί.', sortOrder: 1 }),
    storyInvitationText({ id: 'text-2', language: 'en', label: 'Formal', body: 'Together with our families,\nwe invite you to our wedding.' }),
    storyInvitationText({ id: 'text-3', eventType: 'BAPTISM', label: 'Ζεστό', body: 'Ελάτε να γιορτάσουμε μαζί\nτη βάπτιση της μικρής μας.', sortOrder: 1 }),
];
