import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignLinkLabel } from '@/components/admin/campaigns/CampaignLinkLabel';

const meta = {
    title: 'Admin/Campaigns/LinkLabel',
    component: CampaignLinkLabel,
    args: { label: { platform: 'instagram', type: 'storyAd', text: null, language: 'el', page: null } },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignLinkLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// Under its platform's row: the platform icon is left out.
export const UnderItsPlatform: Story = { args: { showPlatform: false } };
export const PartnerOnAnotherPage: Story = { args: { label: { platform: 'partner', type: null, text: 'acme', language: 'el', page: '/el/gamos' } } };
// Inside a link row, which carries the name and the tip.
export const InsideARow: Story = { args: { decorative: true } };
