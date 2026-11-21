import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { RsvpDeadlineCard } from '@/components/manage/rsvp/RsvpDeadlineCard';

// The story clock is frozen at 2026-06-15 (see .storybook/preview.tsx), so the day count is stable.
const meta = {
    title: 'Manage/RSVP/RsvpDeadlineCard',
    component: RsvpDeadlineCard,
    decorators: [
        (Story) => (
            <div className="max-w-[420px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        eventId: 'evt-story',
        rsvpDeadline: '2026-07-03T00:00:00Z',
        startAt: '2026-07-25T16:00:00Z',
        timeZone: 'Europe/Athens',
        canWrite: true,
    },
} satisfies Meta<typeof RsvpDeadlineCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Counting down to the RSVP deadline, with the pencil.
export const WithDeadline: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).ManagePage.rsvpStats;
        await expect(canvas.getByText(copy.deadlineLabel)).toBeVisible();
        await expect(canvas.getByRole('button', { name: copy.editDeadline })).toBeVisible();
    },
};

// No deadline set: counts down to the event instead.
export const NoDeadline: Story = {
    args: { rsvpDeadline: null },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).ManagePage.rsvpStats.eventDateLabel)).toBeVisible();
    },
};

// The event can no longer change: no pencil.
export const ReadOnly: Story = {
    args: { canWrite: false },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByRole('button', { name: copyFor(globals).ManagePage.rsvpStats.editDeadline })).toBeNull();
    },
};
