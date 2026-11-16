import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { copyFor } from '@/.storybook/copy';
import { QrCardLogo } from '@/components/qrCard/QrCardLogo';
import { logoHeight } from '@/lib/qrCardLayout';

// The logo on its own, drawn in an SVG the size of its box (in millimetres), shown 4× larger.
const meta = {
    title: 'QrCard/QrCardLogo',
    component: QrCardLogo,
    args: { logo: { x: 0, y: 0, width: 45, color: null } },
    render: ({ logo }, { globals }) => (
        <svg
            role="img"
            aria-label={copyFor(globals).AdminPage.qrCards.layout.elements.logo}
            viewBox={`0 0 ${logo.width} ${logoHeight(logo.width)}`}
            className="block h-auto w-[360px]"
            style={{ background: logo.color === '#FFFFFF' ? '#1F2A44' : '#FFFFFF' }}
        >
            <QrCardLogo logo={logo} />
        </svg>
    ),
} satisfies Meta<typeof QrCardLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

// Brand colours.
export const Original: Story = {};

// One colour, white on dark artwork: the sparkle is cut out, so the artwork shows through.
export const OneColourWhite: Story = { args: { logo: { x: 0, y: 0, width: 45, color: '#FFFFFF' } } };

// One colour, dark on light artwork.
export const OneColourDark: Story = { args: { logo: { x: 0, y: 0, width: 45, color: '#5A3E2B' } } };
