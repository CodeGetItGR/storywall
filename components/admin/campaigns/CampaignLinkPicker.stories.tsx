import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignDetailFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinkPicker } from '@/components/admin/campaigns/CampaignLinkPicker';
import { useCampaignLinkPicker } from '@/hooks/useCampaignLinkPicker';
import type { CampaignLinkDto } from '@/lib/api/types';

const LINKS = campaignDetailFixture.links.map((stats) => stats.link);

// The picker for the launch campaign, with the links it already has.
function PickerStory({ links }: { links: CampaignLinkDto[] }) {
    const picker = useCampaignLinkPicker(campaignDetailFixture.campaign.linkName, links);
    return <CampaignLinkPicker picker={picker} />;
}

const meta = {
    title: 'Admin/Campaigns/LinkPicker',
    component: PickerStory,
    args: { links: [] },
    decorators: [withAdminShell],
} satisfies Meta<typeof PickerStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// A new campaign: nothing ticked, both languages, the home page.
export const Default: Story = {};

// Partner and Other ticked: their fields show.
export const PartnerAndOther: Story = {
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('checkbox', { name: copy.presets.partner }));
        await userEvent.click(canvas.getByRole('checkbox', { name: copy.presets.custom }));
        await expect(canvas.getByRole('textbox', { name: copy.picker.partnerName })).toBeInTheDocument();
    },
};

// The campaign's own placements show ticked and faded.
export const AlreadyAdded: Story = { args: { links: LINKS } };

// Reached by keyboard: the chip's words show under it.
export const Focused: Story = {
    tags: ['visual-desktop-only'],
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        await userEvent.tab();
        const words = `${copy.presets.instagram} ${copy.linkTypes.post}`;
        await expect(await within(canvasElement.ownerDocument.body).findByText(words)).toHaveAttribute('aria-hidden', 'true');
    },
};
