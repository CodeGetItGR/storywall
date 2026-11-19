import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyHostMember } from '@/.storybook/fixtures';
import { BillingExtensionSection } from '@/components/manage/billing/BillingExtensionSection';
import type { ExtensionOptionResponseDto } from '@/lib/api/types';

function extensionOption(months: number, amountMinor: number, resultingCoverageEndsAt: string): ExtensionOptionResponseDto {
    return {
        coverageOptionId: `ext-${months}`,
        months,
        amountMinor,
        currency: 'EUR',
        resultingCoverageEndsAt,
        // Not read by the section.
        breakdown: {} as ExtensionOptionResponseDto['breakdown'],
    };
}

const options = [
    extensionOption(1, 900, '2027-04-12T16:00:00Z'),
    extensionOption(3, 1900, '2027-06-12T16:00:00Z'),
    extensionOption(6, 2900, '2027-09-12T16:00:00Z'),
];

const meta = {
    title: 'Manage/Billing/BillingExtensionSection',
    component: BillingExtensionSection,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { eventId: 'evt-billing', eventStatus: 'ACTIVE', coverageEndsAt: '2099-03-12T16:00:00Z', canPurchase: true },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/extension-options', () => HttpResponse.json(options)));
    },
} satisfies Meta<typeof BillingExtensionSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Three lengths, the shortest picked; the estimate and the button follow the pick.
export const Lengths: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const three = await canvas.findByRole('radio', { name: /3/ });
        await userEvent.click(three);
        await expect(three).toHaveAttribute('aria-checked', 'true');
    },
};

// Coverage ended since the page loaded (5085): no purchase.
export const Ended: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/extension-options', () => HttpResponse.json({ status: 409, errorCode: 5085 }, { status: 409 })));
    },
};
