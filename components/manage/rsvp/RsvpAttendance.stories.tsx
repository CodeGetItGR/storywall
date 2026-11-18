import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { RsvpAttendance } from '@/components/manage/rsvp/RsvpAttendance';
import type { RsvpReportDto } from '@/lib/api/types';

const report: RsvpReportDto = {
    reportType: 'STATISTICS',
    header: { eventTitle: 'Maria & Nikos', eventTypeName: 'Wedding', eventDate: '2026-08-30' } as RsvpReportDto['header'],
    totals: { responses: 96, people: 168, adults: 142, children: 26 },
    categories: [
        { label: 'Attending', attending: true, people: 152, responses: 80, percentOfPeople: 90, comingSessionIds: ['s1', 's2'], noAnswerSessionIds: [] },
        { label: 'Church only', attending: true, people: 16, responses: 4, percentOfPeople: 10, comingSessionIds: ['s1'], noAnswerSessionIds: [] },
        { label: 'Not attending', attending: false, people: 0, responses: 12, percentOfPeople: null, comingSessionIds: [], noAnswerSessionIds: [] },
    ],
    sessions: [
        { sessionId: 's1', title: 'Church', people: 152, noAnswerPeople: 8 },
        { sessionId: 's2', title: 'Reception', people: 146, noAnswerPeople: 14 },
    ],
    groups: null,
};

const meta = {
    title: 'Manage/RSVP/RsvpAttendance',
    component: RsvpAttendance,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { report, isLoading: false, isError: false },
} satisfies Meta<typeof RsvpAttendance>;

export default meta;
type Story = StoryObj<typeof meta>;

// Categories with bars, then people per session.
export const WithSessions: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: copyFor(globals).ManagePage.rsvpStats.byCategory })).toBeVisible();
    },
};

export const NoResponses: Story = {
    args: { report: { ...report, totals: { responses: 0, people: 0, adults: 0, children: 0 } } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).ManagePage.rsvpReport.empty)).toBeVisible();
    },
};

export const Loading: Story = {
    args: { report: null, isLoading: true },
};
