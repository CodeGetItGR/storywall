import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_EVENT_ID, storyEventAllowingVendors, storyHostMember } from '@/.storybook/fixtures';
import { VendorsEmpty } from '@/components/vendors/manage/VendorsEmpty';
import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';
import { useVendorScene } from '@/hooks/useVendorScene';

// The empty state as the page builds it, from the story event's allowed types.
function EmptyForEvent() {
    return <VendorsEmpty scene={useVendorScene(STORY_EVENT_ID)} items={useVendorCapabilities(STORY_EVENT_ID)} />;
}

const meta = {
    title: 'Manage/Vendors/VendorsEmpty',
    component: EmptyForEvent,
    decorators: [
        (Story) => (
            <div className="max-w-[760px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: {
        app: {
            member: storyHostMember,
            event: storyEventAllowingVendors(['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER']),
        },
    },
} satisfies Meta<typeof EmptyForEvent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every type: the whole picture with seven markers, and eight rows.
export const AllTypes: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).Vendors.manage.joinedEmpty)).toBeVisible();
        await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
    },
};

// A plan with a venue, catering and other vendors only.
export const PlanSubset: Story = {
    parameters: { app: { member: storyHostMember, event: storyEventAllowingVendors(['VENUE', 'CATERING', 'OTHER']) } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(3);
    },
};
