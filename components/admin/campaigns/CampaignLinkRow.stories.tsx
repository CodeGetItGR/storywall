import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignDetailFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinkRow } from '@/components/admin/campaigns/CampaignLinkRow';
import { useCampaignLinkWords } from '@/hooks/useCampaignLinkWords';
import { campaignLinkLabel, campaignLinkShareUrl } from '@/lib/campaignLinks';

const LINKS = campaignDetailFixture.links.map((stats) => stats.link);

// One of the launch campaign's links as a row of the links drawer.
function RowStory({ linkId, onOpenAction }: { linkId: string; onOpenAction: () => void }) {
    const words = useCampaignLinkWords();
    const link = LINKS.find((entry) => entry.id === linkId) ?? LINKS[0];
    const label = campaignLinkLabel(link, LINKS);

    return <CampaignLinkRow row={{ link, label, name: words.link(label), url: campaignLinkShareUrl(link) }} onOpenAction={onOpenAction} />;
}

const meta = {
    title: 'Admin/Campaigns/LinkRow',
    component: RowStory,
    args: { linkId: 'ig-story-ad-el', onOpenAction: fn() },
    // A row sits in the drawer's list.
    decorators: [
        (Story) => (
            <ul className="w-80">
                <Story />
            </ul>
        ),
        withAdminShell,
    ],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof RowStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StoryAd: Story = {};
export const Partner: Story = { args: { linkId: 'partner-el' } };
// A Google search ad copies its full address, not a short one.
export const SearchAd: Story = { args: { linkId: 'google-el' } };

// Reached by keyboard: the link's words show under it.
export const Focused: Story = {
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        await userEvent.tab();
        const words = `${copy.presets.instagram} ${copy.linkTypes.storyAd} ${copy.languages.el}`;
        await expect(await within(canvasElement.ownerDocument.body).findByText(words)).toHaveAttribute('aria-hidden', 'true');
    },
};
