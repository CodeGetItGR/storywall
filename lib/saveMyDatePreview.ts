import { INVITATION_SCHEMA_VERSION, type InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { ThemeDesign } from '@/lib/invitation/theme';

// The invitation the staging preview page shows. Its texts are a host's
// content, not app copy, so they stay as data. Images come from public/.

const PREVIEW_MEDIA: Record<string, string> = {
    'm-top': '/images/venue.png',
    'm-main-art': '/images/couple-hero.png',
    'm-leaf': '/images/post-florals.png',
};

export const previewMedia: MediaResolver = (mediaId) => PREVIEW_MEDIA[mediaId];

export const PREVIEW_THEME: ThemeDesign = {
    ...SAMPLE_THEME,
    backgrounds: {
        top: { desktop: { mediaId: 'm-top' }, mode: 'cover', stableRepeat: false },
        content: { mode: 'cover', stableRepeat: false },
        extra: { mode: 'cover', stableRepeat: false },
    },
    art: { main: { image: { mediaId: 'm-main-art' }, scale: 0.8, animation: 'fade' } },
    fonts: { title: "'Playfair Display',serif", body: "'Lora',serif" },
    autoTextContrast: true,
};

const blank = SAMPLE_SECTIONS.blank;

export const PREVIEW_DOCUMENT: InvitationDocument = {
    schemaVersion: INVITATION_SCHEMA_VERSION,
    themeId: 'preview',
    overrides: {},
    sections: [
        {
            ...SAMPLE_SECTIONS.top,
            style: { ...SAMPLE_SECTIONS.top.style, effect: undefined },
            elements: [
                { id: 'top-title', kind: 'text', role: 'title', text: 'Μαρία & Γιώργος', style: { size: 44 } },
                { id: 'top-date', kind: 'text', role: 'paragraph', text: '12 Ιουνίου 2027', style: { size: 18 } },
            ],
        },
        {
            ...blank,
            id: 's-blank-1',
            elements: [
                { id: 'b1-title', kind: 'text', role: 'title', text: 'Σας προσκαλούμε', style: { size: 34 } },
                {
                    id: 'b1-body',
                    kind: 'text',
                    role: 'paragraph',
                    text: 'Με χαρά σας προσκαλούμε στον γάμο μας.\nΘα χαρούμε πολύ να είστε μαζί μας.',
                    style: { size: 17, lineHeight: 1.7 },
                },
                { id: 'b1-leaf', kind: 'image', image: { source: 'theme', assetId: 'el-leaf' }, width: 180 },
                { id: 'b1-link', kind: 'link', text: 'Χάρτης', url: 'https://maps.google.com' },
            ],
        },
        {
            ...blank,
            id: 's-blank-2',
            style: { ...blank.style, background: { kind: 'color', color: '#2f2b2d' } },
            elements: [
                { id: 'b2-head', kind: 'text', role: 'title', text: 'Πρόγραμμα', fullWidth: true, style: { size: 34 } },
                { id: 'b2-left', kind: 'text', role: 'subtitle', text: 'Τελετή\n18:00', style: { size: 22 } },
                { id: 'b2-break', kind: 'columnBreak' },
                { id: 'b2-right', kind: 'text', role: 'subtitle', text: 'Δεξίωση\n21:00', style: { size: 22 } },
            ],
        },
        {
            ...blank,
            id: 's-blank-hidden',
            visible: false,
            elements: [{ id: 'hidden-text', kind: 'text', role: 'paragraph', text: 'Κρυφό', style: {} }],
        },
        {
            ...blank,
            id: 's-blank-3',
            elements: [
                { id: 'b3-text', kind: 'text', role: 'paragraph', text: 'Σας περιμένουμε!', style: { size: 20, italic: true } },
                { id: 'b3-space', kind: 'spacer', height: 24 },
            ],
        },
    ],
};
