import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { VendorCapabilityRow } from '@/components/vendors/manage/VendorCapabilityRow';

const meta = {
    title: 'Manage/Vendors/VendorCapabilityRow',
    component: VendorCapabilityRow,
    decorators: [
        (Story) => (
            <ul className="max-w-[340px] p-5">
                <Story />
            </ul>
        ),
    ],
    args: {
        item: { type: 'PHOTOGRAPHER', title: 'Photographer', body: 'Adds pro photos, shares a sneak peek and gets your print picks.' },
        marker: 'soft',
    },
} satisfies Meta<typeof VendorCapabilityRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// In "What vendors can do".
export const Soft: Story = {};

// Under the empty-state picture.
export const Outline: Story = { args: { marker: 'outline' } };
