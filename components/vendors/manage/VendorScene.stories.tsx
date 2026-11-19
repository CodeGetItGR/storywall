import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { VendorScene } from '@/components/vendors/manage/VendorScene';
import { VENDOR_SCENE_TYPES } from '@/lib/vendors';

const meta = {
    title: 'Manage/Vendors/VendorScene',
    component: VendorScene,
    decorators: [
        (Story) => (
            <div className="max-w-[720px] p-5">
                <Story />
            </div>
        ),
    ],
    args: {
        scene: {
            types: [...VENDOR_SCENE_TYPES],
            alt: 'Vendors at an event: photographer, videographer, venue, decoration, planner, catering and music',
        },
    },
} satisfies Meta<typeof VendorScene>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every type allowed: the full drawing, each with its marker.
export const AllTypes: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('img', { name: /^Vendors at an event/ })).toBeVisible();
    },
};

// A plan with a photographer, a planner and music: the full drawing, with only their three markers.
export const SomeTypes: Story = {
    args: { scene: { types: ['PHOTOGRAPHER', 'PLANNER', 'MUSIC'], alt: 'Vendors at an event: photographer, planner and music' } },
    play: async ({ canvasElement }) => {
        const scene = within(canvasElement).getByRole('img', { name: /^Vendors at an event/ });
        await expect(scene.querySelectorAll('svg [data-vendor-type]')).toHaveLength(8);
        await expect(scene.querySelectorAll(':scope > span')).toHaveLength(3);
    },
};
