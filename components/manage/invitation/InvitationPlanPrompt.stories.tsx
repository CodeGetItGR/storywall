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
    args: { invitation: { planHref: '/events/evt-story/manage?tab=plan', addOnHref: null, addOnPrice: null } },
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

// The plan sells the invitation as an add-on (KAN-82): adding it leads, the upgrade comes second.
export const WithAddOn: Story = {
    args: {
        invitation: {
            planHref: '/events/evt-story/manage?tab=plan',
            addOnHref: '/events/evt-story/settings/addons?add=SAVE_MY_DATE',
            addOnPrice: '€29.00',
        },
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.ManagePage.invitation.addOnBody)).toBeVisible();
        const links = canvas.getAllByRole('link');
        await expect(links[0]).toHaveAttribute('href', '/events/evt-story/settings/addons?add=SAVE_MY_DATE');
        await expect(links[1]).toHaveAccessibleName(copy.ManagePage.invitation.upgradePlan);
    },
};

// With the add-on, on a phone.
export const WithAddOnPhone: Story = { args: WithAddOn.args, globals: { viewport: { value: 'mobile' } } };
