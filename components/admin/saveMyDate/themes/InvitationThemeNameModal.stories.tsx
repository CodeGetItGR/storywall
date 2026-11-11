import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { InvitationThemeNameModal } from '@/components/admin/saveMyDate/themes/InvitationThemeNameModal';
import { storyThemeList } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

const meta = {
    title: 'Admin/SaveMyDate/Themes/InvitationThemeNameModal',
    component: InvitationThemeNameModal,
    decorators: [withAdminShell],
    args: {
        state: { mode: 'create' },
        themes: storyThemeList,
        eventTypes: [
            { key: 'WEDDING', label: 'Wedding' },
            { key: 'BAPTISM', label: 'Baptism' },
            { key: 'BIRTHDAY', label: 'Birthday' },
            { key: 'BABY_SHOWER', label: 'Baby shower' },
            { key: 'GENDER_REVEAL', label: 'Gender reveal' },
        ],
        onCloseAction: fn(),
        onNamedAction: fn(),
    },
} satisfies Meta<typeof InvitationThemeNameModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
    play: async () => {
        await waitForOpen('dialog');
    },
};

export const Duplicate: Story = {
    args: { state: { mode: 'duplicate', sourceId: 'theme-1', sourceName: 'Γάμος 001' } },
    play: async () => {
        await waitForOpen('dialog');
    },
};

// Create with no name: the field says what it needs.
export const NameMissing: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).AdminPage.invitationThemes;
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: copy.nameModal.create }));
        await within(dialog).findByText(copy.drawer.nameInvalid);
    },
};
