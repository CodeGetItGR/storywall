import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyEventAllowingVendors, storyHostMember } from '@/.storybook/fixtures';
import { VendorCapabilities } from '@/components/vendors/manage/VendorCapabilities';
import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';

const EVENT = storyEvent();

// The section as the page builds it, from the story event's vendors.allowedTypes.
function CapabilitiesForEvent() {
    return <VendorCapabilities items={useVendorCapabilities(EVENT.id)} />;
}

const meta = {
    title: 'Manage/Vendors/VendorCapabilities',
    component: CapabilitiesForEvent,
    decorators: [
        (Story) => (
            <div className="max-w-[340px] p-5">
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
} satisfies Meta<typeof CapabilitiesForEvent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every type, one row each, other vendors last.
export const AllTypes: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: copy.Vendors.manage.can.title })).toBeVisible();
        await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
        await expect(canvas.getByText(copy.Vendors.manage.can.VENUE)).toBeVisible();
        await expect(canvas.getByText(copy.Vendors.manage.can.listed)).toBeVisible();
    },
};

// A plan with a photographer, a venue and catering only.
export const SomeTypes: Story = {
    parameters: { app: { member: storyHostMember, event: storyEventAllowingVendors(['VENUE', 'PHOTOGRAPHER', 'CATERING']) } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(3);
    },
};
