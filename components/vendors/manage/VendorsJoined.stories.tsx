import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { expect, fn, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_EVENT_ID, storyEventAllowingVendors, storyHostMember } from '@/.storybook/fixtures';
import { VendorsJoined } from '@/components/vendors/manage/VendorsJoined';
import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';
import { useVendorScene } from '@/hooks/useVendorScene';
import type { VendorRowDto } from '@/lib/api/types';

function vendor(id: string, vendorType: VendorRowDto['vendorType'], businessName: string, hiddenByHost = false): VendorRowDto {
    return { id, memberId: `mem-${id}`, vendorType, businessName, link: null, logoUrl: null, joinedAt: '2026-10-01T10:00:00Z', hiddenByHost, optedOut: false };
}

const VENDORS = [
    vendor('studio', 'PHOTOGRAPHER', 'Lumière Studio'),
    vendor('ktima', 'VENUE', 'Ktima Ampeli'),
    vendor('anthos', 'DECORATION', 'Anthos Flowers'),
    vendor('petros', 'MUSIC', 'DJ Petros', true),
];

const ALL_TYPES = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER'] as const;

// The list as the page builds it: the picture and the rows come from the story event's allowed types.
function JoinedForEvent(props: Omit<ComponentProps<typeof VendorsJoined>, 'scene' | 'capabilities'>) {
    return <VendorsJoined {...props} scene={useVendorScene(STORY_EVENT_ID)} capabilities={useVendorCapabilities(STORY_EVENT_ID)} />;
}

const meta = {
    title: 'Manage/Vendors/VendorsJoined',
    component: JoinedForEvent,
    decorators: [
        (Story) => (
            <div className="max-w-[760px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember, event: storyEventAllowingVendors([...ALL_TYPES]) } },
    args: {
        vendors: VENDORS,
        listError: null,
        patchingVendorId: null,
        seats: { seatsLabel: '4 / 5', seatsSpoken: '4 of 5 vendor seats used', percent: 80 },
        notice: null,
        onInviteAction: fn(),
        onOpenAction: fn(),
        onToggleHiddenAction: fn(),
        onRemoveAction: fn(),
    },
} satisfies Meta<typeof JoinedForEvent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Four vendors, one hidden, the seats bar and Invite.
export const WithVendors: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: copyFor(globals).Vendors.manage.invite })).toBeVisible();
        await expect(canvas.getByRole('img', { name: '4 of 5 vendor seats used' })).toBeVisible();
    },
};

// Every seat taken: the notice instead of Invite.
export const Full: Story = {
    args: {
        vendors: [...VENDORS, vendor('chef', 'CATERING', 'Meze & Co')],
        seats: { seatsLabel: '5 / 5', seatsSpoken: '5 of 5 vendor seats used', percent: 100 },
        notice: 'This event has reached its vendor limit.',
    },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).queryByRole('button', { name: copyFor(globals).Vendors.manage.invite })).not.toBeInTheDocument();
    },
};

// No vendors yet, every type allowed: the whole picture and a row per type.
export const Empty: Story = {
    args: { vendors: [], seats: { seatsLabel: '0 / 5', seatsSpoken: '0 of 5 vendor seats used', percent: 0 } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.Vendors.manage.joinedEmpty)).toBeVisible();
        await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
        await expect(canvasElement.querySelectorAll('svg [data-vendor-type]')).toHaveLength(8);
    },
};

// No vendors yet on a plan with a photographer, a planner and music: the full picture, with only those marked and listed.
export const EmptyPlanSubset: Story = {
    args: { vendors: [], seats: { seatsLabel: '0 / 3', seatsSpoken: '0 of 3 vendor seats used', percent: 0 } },
    parameters: { app: { member: storyHostMember, event: storyEventAllowingVendors(['PHOTOGRAPHER', 'PLANNER', 'MUSIC']) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
        await expect(canvasElement.querySelectorAll('svg [data-vendor-type]')).toHaveLength(8);
        await expect(canvasElement.querySelectorAll('[role="img"]:has([data-vendor-type]) > span')).toHaveLength(3);
    },
};
