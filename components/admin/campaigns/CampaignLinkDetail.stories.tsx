import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { campaignDetailFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinkDetail } from '@/components/admin/campaigns/CampaignLinkDetail';
import { useCampaignLinkWords } from '@/hooks/useCampaignLinkWords';
import type { CampaignDto } from '@/lib/api/types';
import { campaignLinkLabel, campaignLinkShareUrl } from '@/lib/campaignLinks';

const LINKS = campaignDetailFixture.links.map((stats) => stats.link);
const OTHERS = campaignListFixture.items.map((item) => item.campaign).filter((campaign) => campaign.id !== 'launch');

// The Facebook post opened in the links drawer.
function DetailStory({
    moveOptions,
    busy,
    onBackAction,
    onMoveTargetChangeAction,
    onMoveAction,
    onDeleteAction,
}: {
    moveOptions: readonly CampaignDto[];
    busy: boolean;
    onBackAction: () => void;
    onMoveTargetChangeAction: () => void;
    onMoveAction: () => void;
    onDeleteAction: () => void;
}) {
    const words = useCampaignLinkWords();
    const link = LINKS.find((entry) => entry.id === 'fb-post-el') ?? LINKS[0];
    const label = campaignLinkLabel(link, LINKS);

    return (
        <CampaignLinkDetail
            row={{ link, label, name: words.link(label), url: campaignLinkShareUrl(link) }}
            moveOptions={moveOptions}
            moveTarget={moveOptions[0]?.id ?? ''}
            busy={busy}
            onBackAction={onBackAction}
            onMoveTargetChangeAction={onMoveTargetChangeAction}
            onMoveAction={onMoveAction}
            onDeleteAction={onDeleteAction}
        />
    );
}

const meta = {
    title: 'Admin/Campaigns/LinkDetail',
    component: DetailStory,
    args: { moveOptions: OTHERS, busy: false, onBackAction: fn(), onMoveTargetChangeAction: fn(), onMoveAction: fn(), onDeleteAction: fn() },
    decorators: [
        (Story) => (
            <div className="max-w-md">
                <Story />
            </div>
        ),
        withAdminShell,
    ],
} satisfies Meta<typeof DetailStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// The only campaign: nowhere to move it.
export const NoOtherCampaigns: Story = { args: { moveOptions: [] } };
export const Saving: Story = { args: { busy: true } };
