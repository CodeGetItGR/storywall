import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { PublishPlanDialog } from '@/components/saveMyDate/editor/publish/PublishPlanDialog';

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishPlanDialog',
    component: PublishPlanDialog,
    args: { prompt: 'plan-missing', onSeePlan: fn(), onClose: fn() },
} satisfies Meta<typeof PublishPlanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// The event's plan has no Save my date.
export const PlanMissing: Story = {
    play: async ({ args, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByText(copy.planMissingTitle)).toBeVisible();
        await userEvent.click(dialog.getByRole('button', { name: copy.seePlan }));
        await expect(args.onSeePlan).toHaveBeenCalledOnce();
    },
};

// The event's plan has ended.
export const PlanEnded: Story = {
    args: { prompt: 'coverage-ended' },
    play: async ({ args, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByText(copy.planEndedTitle)).toBeVisible();
        await userEvent.click(dialog.getByText(copy.notNow, { selector: 'button' }));
        await expect(args.onClose).toHaveBeenCalled();
    },
};
