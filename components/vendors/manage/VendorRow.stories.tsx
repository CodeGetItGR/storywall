import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { VendorRow } from '@/components/vendors/manage/VendorRow';
import type { VendorRowDto } from '@/lib/api/types';

const studio: VendorRowDto = {
    id: 'ven-studio',
    memberId: 'mem-studio',
    vendorType: 'PHOTOGRAPHER',
    businessName: 'Lumière Studio',
    link: null,
    logoUrl: null,
    joinedAt: '2026-10-01T10:00:00Z',
    hiddenByHost: false,
    optedOut: false,
};

const meta = {
    title: 'Manage/Vendors/VendorRow',
    component: VendorRow,
    decorators: [
        (Story) => (
            <ul className="max-w-[560px] p-5">
                <Story />
            </ul>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        vendor: studio,
        isPatching: false,
        onOpenAction: fn(),
        onToggleHiddenAction: fn(),
        onRemoveAction: fn(),
    },
} satisfies Meta<typeof VendorRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Listed: name and type, no label.
export const Listed: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Lumière Studio')).toBeVisible();
        await expect(canvas.queryByText(copyFor(globals).Vendors.manage.hidden)).not.toBeInTheDocument();
    },
};

// Hidden by the host: dimmed logo, grey name and a plain "Hidden".
export const Hidden: Story = {
    args: { vendor: { ...studio, vendorType: 'MUSIC', businessName: 'DJ Petros', hiddenByHost: true } },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).Vendors.manage.hidden)).toBeVisible();
    },
};

// No details yet: named plainly.
export const NoProfile: Story = {
    args: { vendor: { ...studio, vendorType: 'VENUE', businessName: null } },
};

// The ⋯ menu open: Hide from list and Remove.
export const MenuOpen: Story = {
    play: async ({ canvasElement, globals }) => {
        const label = copyFor(globals).ManagePage.members.moreFor.replace('{name}', studio.businessName ?? '');
        await userEvent.click(within(canvasElement).getByRole('button', { name: label }));
        await waitForOpen('menu');
    },
};

// Opted out: shown as hidden, and the menu has only Remove.
export const OptedOutMenu: Story = {
    args: { vendor: { ...studio, optedOut: true } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.ManagePage.members.moreFor.replace('{name}', 'Lumière Studio') }));
        const menu = within(await waitForOpen('menu'));
        // The menu fades in, so wait for the item rather than asserting it is visible straight away.
        await expect(await menu.findByRole('menuitem', { name: copy.Vendors.manage.remove })).toBeInTheDocument();
        await expect(menu.queryByRole('menuitem', { name: copy.Vendors.manage.show })).not.toBeInTheDocument();
    },
};
