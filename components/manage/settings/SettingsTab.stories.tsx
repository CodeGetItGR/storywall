import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyHostMember, storyMedia, storySession } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import SettingsTab from '@/app/(main)/(app)/(event)/events/[eventId]/manage/SettingsTab';
import type { EventCapabilitiesDto } from '@/lib/api/types';

const withoutVenue = storyEvent({
    location: { name: 'Agios Nikolaos church', address: 'Agiou Nikolaou 4, Kifisia', mapsUrl: null },
    sessions: [storySession()],
});

const withVenue = storyEvent({
    location: { name: 'Agios Nikolaos church', address: 'Agiou Nikolaou 4, Kifisia', mapsUrl: null },
    coverMedia: storyMedia('cover'),
    sessions: [
        storySession(),
        storySession({
            id: 'ses-party',
            title: 'Reception',
            isMain: false,
            isSecondary: true,
            displayOrder: 1,
            startAt: '2026-07-04T17:30:00Z',
            locationName: 'Ktima Lena',
            locationAddress: 'Marathonos 12, Pikermi',
        }),
    ],
});

const LITE: EventCapabilitiesDto = {
    kind: 'LITE',
    home: 'GALLERY',
    takesGuests: false,
    hasSchedule: false,
    showsDetailsSettings: false,
    showsShareLinks: false,
    showsGuestCode: true,
    guestCodeActions: [],
};
const lite = storyEvent({ eventType: 'BIRTHDAY', title: 'Anna turns 30', capabilities: LITE, sessions: [] });

const meta = {
    title: 'Manage/Settings/SettingsTab',
    component: SettingsTab,
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-5xl p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember, event: withoutVenue } },
    args: { event: withoutVenue, canWrite: true },
} satisfies Meta<typeof SettingsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

// A wedding with no venue yet: each part has a pencil and the venue prompt shows.
export const WeddingWithoutVenue: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals);
        await expect(canvas.getByRole('button', { name: copy.HostOnboarding.steps.details.venueAdd })).toBeVisible();
        await expect(canvas.getByRole('button', { name: copy.ManagePage.settings.coverPhoto.upload })).toBeVisible();
    },
};

// With a cover photo and the venue added: the venue row has its own pencil.
export const WeddingWithVenue: Story = {
    args: { event: withVenue },
    parameters: { app: { member: storyHostMember, event: withVenue } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Ktima Lena')).toBeVisible();
        await expect(canvas.getByRole('button', { name: copyFor(globals).HostOnboarding.steps.details.venueEdit })).toBeVisible();
    },
};

// The title's pencil opens its editor (a sheet on phones).
export const EditingTitlePhone: Story = {
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals);
        const title = copy.CreateEventPage.fieldLabels.WEDDING.title;
        await userEvent.click(canvas.getByRole('button', { name: copy.ManagePage.sessionManagement.editNamed.replace('{title}', title) }));
        const dialog = await waitForOpen('dialog');
        await expect(within(dialog).getByRole('heading', { name: title })).toBeVisible();
    },
};

// A lite event: only the cover, title and description.
export const Lite: Story = {
    args: { event: lite },
    parameters: { app: { member: storyHostMember, event: lite } },
};

// A read-only event: the notice and no pencils.
export const ReadOnly: Story = {
    args: { canWrite: false, canUploadCover: false },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).ManagePage.settings.readOnly)).toBeVisible();
        await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    },
};
