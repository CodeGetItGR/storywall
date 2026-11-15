import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { SectionSettingsStory } from '@/.storybook/sectionSettings';
import { waitForOpen } from '@/.storybook/waitForOpen';

// A section's settings in the sheet phones and tablets open. Computers dock
// them beside the canvas (SectionSettingsDocked).
const meta = {
    title: 'SaveMyDate/Editor/SectionSettings',
    component: SectionSettingsStory,
    args: { sectionId: 's-date', isAdmin: false, isDocked: false, onClose: fn() },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof SectionSettingsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openSheet() {
    return within(await waitForOpen('dialog'));
}

export const DateSection: Story = {};

// A photo that shows the event's cover: the switch comes first, and turning it off keeps the invitation's own photo.
export const FollowingTheEvent: Story = {
    args: { sectionId: 's-photo', followsEvent: true },
    play: async ({ globals }) => {
        const sheet = await openSheet();
        const toggle = sheet.getByRole('switch', { name: copyFor(globals).InvitationEditor.sectionSettings.followEvent });
        await expect(toggle).toBeChecked();
        await userEvent.click(toggle);
        await expect(toggle).not.toBeChecked();
    },
};

export const Countdown: Story = { args: { sectionId: 's-countdown' } };

export const Faq: Story = { args: { sectionId: 's-faq' } };

export const Rsvp: Story = { args: { sectionId: 's-rsvp' } };

export const Program: Story = { args: { sectionId: 's-program' } };

export const ProgramIcons: Story = { args: { sectionId: 's-programIcons' } };

export const Accommodation: Story = { args: { sectionId: 's-accommodation' } };

export const Contact: Story = { args: { sectionId: 's-contact' } };

export const CoupleContact: Story = { args: { sectionId: 's-coupleContact' } };

export const Locations: Story = { args: { sectionId: 's-locations' } };

export const DressCode: Story = { args: { sectionId: 's-dressCode' } };

// A section with a button in it.
export const Buttons: Story = { args: { sectionId: 's-blank-1' } };

// One moment open on its own.
export const ProgramMomentOpen: Story = {
    args: { sectionId: 's-program' },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = await openSheet();
        await userEvent.click(sheet.getByRole('button', { name: /Μυστήριο/ }));
        await expect(sheet.getByRole('group', { name: copy.moment })).toBeVisible();
    },
};

// The program on the event's schedule (KAN-84): no new moments here, a note says where to change them.
export const ProgramFromTheEvent: Story = {
    args: { sectionId: 's-program', onEvent: true },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = await openSheet();
        await expect(sheet.getByRole('link', { name: copy.eventLock.schedule })).toHaveAttribute('href', '/events/evt-wedding/tools/schedule');
        await expect(sheet.queryByRole('button', { name: copy.sectionSettings.addMoment })).toBeNull();
    },
};

// A moment of the event's schedule: its icon still changes here, its words on the schedule.
export const ProgramIconsMomentFromTheEvent: Story = {
    args: { sectionId: 's-programIcons', onEvent: true },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = await openSheet();
        await userEvent.click(sheet.getByRole('button', { name: /Δεξίωση/ }));
        await expect(sheet.getByRole('group', { name: copy.sectionSettings.moment })).toBeVisible();
        await expect(sheet.queryByLabelText(copy.sectionSettings.time)).toBeNull();
        await expect(sheet.queryByRole('button', { name: copy.delete })).toBeNull();
    },
};

// The event's places: each says where to change it instead of offering its map link.
export const LocationsFromTheEvent: Story = {
    args: { sectionId: 's-locations', onEvent: true },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.eventLock;
        const sheet = await openSheet();
        await expect(sheet.getByRole('link', { name: copy.settings })).toHaveAttribute('href', '/events/evt-wedding/manage?tab=settings');
        await expect(sheet.getByRole('link', { name: copy.schedule })).toHaveAttribute('href', '/events/evt-wedding/tools/schedule');
    },
};

// A place to stay with a bad link.
export const InvalidLink: Story = {
    args: { sectionId: 's-accommodation' },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = await openSheet();
        await userEvent.click(sheet.getByRole('button', { name: /Ξενοδοχείο/ }));
        const website = await sheet.findByLabelText(copy.website);
        fireEvent.change(website, { target: { value: 'not a link' } });
        await waitFor(() => expect(website).toHaveValue('not a link'));
        // Leaving the field checks the link; a capture's page may not have focus to move.
        fireEvent.focusOut(website);
        await waitFor(() => expect(website).toHaveAttribute('aria-invalid', 'true'));
    },
};

// Admin: fonts, the theme background, the effect and the transition.
export const AdminCountdown: Story = { args: { sectionId: 's-countdown', isAdmin: true } };

export const AdminFooter: Story = { args: { sectionId: 's-footer', isAdmin: true } };

// Admin: a moment's own icon, after a file of the wrong kind.
export const AdminIconError: Story = {
    args: { sectionId: 's-programIcons', isAdmin: true },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = await openSheet();
        await userEvent.click(sheet.getByRole('button', { name: /Τελετή/ }));
        const file = new File(['hello'], 'icon.txt', { type: 'text/plain' });
        fireEvent.change(sheet.getByLabelText(copy.uploadIcon), { target: { files: [file] } });
        await expect(await sheet.findByText(copy.iconErrors.type)).toBeVisible();
    },
};
