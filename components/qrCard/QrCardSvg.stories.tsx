import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { addLogo, DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

// A dark navy artwork, drawn inline so the story never waits on a file.
const DARK_ARTWORK = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="105" height="148"><rect width="105" height="148" fill="#1F2A44"/></svg>',
)}`;
const WITH_LOGO = addLogo(DEFAULT_QR_CARD_LAYOUT);

function style(overrides: Partial<QrCardStyle>): QrCardStyle {
    return { ...PLAIN_QR_CARD_STYLE, ...overrides };
}

// One printed card, at the size the editor shows it. The card looks the same in both languages.
const meta = {
    title: 'QrCard/QrCardSvg',
    component: QrCardSvg,
    args: {
        style: PLAIN_QR_CARD_STYLE,
        url: 'https://storywall.gr/q/abc123',
        title: 'Maria & Nikos',
        lines: [{ text: 'Scan to share your photos', tone: 'body' }],
        label: 'Maria & Nikos',
        className: 'block h-[444px] w-[315px] shadow-sm',
    },
} satisfies Meta<typeof QrCardSvg>;

export default meta;
type Story = StoryObj<typeof meta>;

// Today's Plain card: title, code and line, no logo.
export const Plain: Story = {};

// The logo in its brand colours, where Add logo puts it on the default layout.
export const Logo: Story = { args: { style: style({ layout: WITH_LOGO }) } };

// The logo across the top in one colour on dark artwork: the sparkle shows the artwork through.
export const LogoOneColourOnDarkArtwork: Story = {
    args: {
        style: style({
            artworkUrl: DARK_ARTWORK,
            textColor: '#FFFFFF',
            codeColor: '#1F2A44',
            layout: {
                ...WITH_LOGO,
                title: { ...DEFAULT_QR_CARD_LAYOUT.title!, y: 27, height: 12 },
                logo: { x: 8, y: 8, width: 89, color: '#FFFFFF' },
            },
        }),
    },
};

// The smallest logo, 20 mm wide.
export const LogoSmallest: Story = {
    args: { style: style({ layout: { ...WITH_LOGO, logo: { x: 42.5, y: 129.7, width: 20, color: null } } }) },
};
