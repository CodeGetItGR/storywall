import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { InvitationPlanPrompt } from '@/components/manage/invitation/InvitationPlanPrompt';

const meta = {
    title: 'Manage/Invitation/InvitationPlanPrompt',
    component: InvitationPlanPrompt,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-event p-5">
                <Story />
            </div>
        ),
    ],
    args: { invitation: { planHref: '/events/evt-story/manage?tab=plan', addOnHref: null } },
} satisfies Meta<typeof InvitationPlanPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

// The plan lacks the invitation: the drawing, what's missing, and the upgrade.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('img', { name: copy.ManagePage.invitation.artAlt })).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.ManagePage.invitation.upgradePlan })).toHaveAttribute(
            'href',
            '/events/evt-story/manage?tab=plan',
        );
    },
};

// On a phone.
export const Phone: Story = { globals: { viewport: { value: 'mobile' } } };
