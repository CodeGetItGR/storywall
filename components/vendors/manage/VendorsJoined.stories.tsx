import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { VendorsJoined } from '@/components/vendors/manage/VendorsJoined';
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

const meta = {
    title: 'Manage/Vendors/VendorsJoined',
    component: VendorsJoined,
    decorators: [
        (Story) => (
            <div className="max-w-[640px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
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
} satisfies Meta<typeof VendorsJoined>;

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

// No vendors yet.
export const Empty: Story = {
    args: { vendors: [], seats: { seatsLabel: '0 / 5', seatsSpoken: '0 of 5 vendor seats used', percent: 0 } },
};
