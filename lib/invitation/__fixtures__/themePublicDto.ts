import { INVITATION_SCHEMA_VERSION } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';
import { PREVIEW_THEME } from '@/lib/saveMyDatePreview';

// A made-up active theme as GET /api/invitation-themes/{slug} sends it, for the preview page's
// tests and story. Its images are the ones in public/images.
export const THEME_PUBLIC_DTO: InvitationThemePublicDto = {
    slug: 'sample-wedding-001',
    name: 'Γάμος 001',
    eventType: 'WEDDING',
    design: {
        ...PREVIEW_THEME,
        backgrounds: {
            top: { desktop: { mediaId: 'smd-top' }, mode: 'cover', stableRepeat: false },
            content: { mode: 'cover', stableRepeat: false },
            extra: { mode: 'cover', stableRepeat: false },
        },
        art: { main: { image: { mediaId: 'smd-main-art' }, scale: 0.8, animation: 'none' } },
        colors: { primary: '#c9a96e', secondary: '#f5efe6', text: '#3b3226' },
        elements: [],
        frames: [],
        transitions: [],
    },
    document: {
        schemaVersion: INVITATION_SCHEMA_VERSION,
        themeId: '1790410178295',
        overrides: {},
        sections: [
            { ...SAMPLE_SECTIONS.top, style: { ...SAMPLE_SECTIONS.top.style, effect: undefined } },
            SAMPLE_SECTIONS.invitation,
            SAMPLE_SECTIONS.coupleNames,
            SAMPLE_SECTIONS.date,
            SAMPLE_SECTIONS.footer,
        ],
    },
    assetUrls: {
        'smd-top': '/images/venue.png',
        'smd-main-art': '/images/post-florals.png',
    },
};
