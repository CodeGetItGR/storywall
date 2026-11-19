import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import { VendorSceneArt } from '@/components/vendors/manage/VendorSceneArt';

const meta = {
    title: 'Manage/Vendors/VendorSceneArt',
    component: VendorSceneArt,
    decorators: [
        (Story) => (
            <div className="max-w-[720px] p-5">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof VendorSceneArt>;

export default meta;
type Story = StoryObj<typeof meta>;

// The full drawing, unfaded and without markers: the ground and lights plus every type.
export const Full: Story = {
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('svg [data-vendor-type]')).toHaveLength(8);
    },
};
