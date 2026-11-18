import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { VendorSceneArt } from '@/components/vendors/manage/VendorSceneArt';
import { VENDOR_SCENE_TYPES } from '@/lib/vendors';

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
    args: { types: [...VENDOR_SCENE_TYPES] },
} satisfies Meta<typeof VendorSceneArt>;

export default meta;
type Story = StoryObj<typeof meta>;

// The full drawing, unfaded and without markers.
export const AllTypes: Story = {};

// The ground and lights alone.
export const NoTypes: Story = { args: { types: [] } };
