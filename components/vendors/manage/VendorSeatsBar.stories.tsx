import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { VendorSeatsBar } from '@/components/vendors/manage/VendorSeatsBar';

const meta = {
    title: 'Manage/Vendors/VendorSeatsBar',
    component: VendorSeatsBar,
    decorators: [
        (Story) => (
            <div className="p-5">
                <Story />
            </div>
        ),
    ],
    args: { label: '4 / 5', spoken: '4 of 5 vendor seats used', percent: 80 },
} satisfies Meta<typeof VendorSeatsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Some seats left.
export const Partly: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('img', { name: '4 of 5 vendor seats used' })).toBeVisible();
    },
};

// Every seat taken.
export const Full: Story = {
    args: { label: '5 / 5', spoken: '5 of 5 vendor seats used', percent: 100 },
};
