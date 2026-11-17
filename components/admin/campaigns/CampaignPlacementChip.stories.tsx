import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignPlacementChip } from '@/components/admin/campaigns/CampaignPlacementChip';
import { useCampaignLinkWords } from '@/hooks/useCampaignLinkWords';
import type { CampaignPlacement } from '@/lib/api/types';
import { CAMPAIGN_PLACEMENTS } from '@/lib/campaignLinks';

// One chip, named the way the picker names it.
function ChipStory({
    placement,
    added,
    checked,
    onChangeAction,
}: {
    placement: CampaignPlacement;
    added: boolean;
    checked: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('AdminPage.campaigns');
    const words = useCampaignLinkWords();
    const option = CAMPAIGN_PLACEMENTS.find((entry) => entry.placement === placement) ?? CAMPAIGN_PLACEMENTS[0];
    const name = words.placement(option);

    return (
        <CampaignPlacementChip
            option={option}
            added={added}
            checked={checked}
            name={added ? `${name} · ${t('picker.added')}` : name}
            onChangeAction={onChangeAction}
        />
    );
}

const meta = {
    title: 'Admin/Campaigns/PlacementChip',
    component: ChipStory,
    args: { placement: 'INSTAGRAM_STORY_AD', added: false, checked: false, onChangeAction: fn() },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof ChipStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unticked: Story = {};
export const Ticked: Story = { args: { checked: true } };
// The campaign already has it: ticked, faded, locked.
export const Added: Story = { args: { added: true, checked: true } };
export const Partner: Story = { args: { placement: 'PARTNER' } };
