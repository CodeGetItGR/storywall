import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpAttendance } from '@/components/manage/rsvp/RsvpAttendance';
import type { RsvpReportDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage;

function report(responses: number): RsvpReportDto {
    return {
        reportType: 'STATISTICS',
        header: {} as RsvpReportDto['header'],
        totals: { responses, people: 168, adults: 142, children: 26 },
        categories: [{ label: 'Attending', attending: true, people: 152, responses: 80, percentOfPeople: 90, comingSessionIds: [], noAnswerSessionIds: [] }],
        sessions: [{ sessionId: 's1', title: 'Church', people: 152, noAnswerPeople: 8 }],
        groups: null,
    };
}

function renderBlock(props: Parameters<typeof RsvpAttendance>[0]) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <RsvpAttendance {...props} />
        </NextIntlClientProvider>,
    );
}

describe('RsvpAttendance', () => {
    it('shows categories and people per session in one block', () => {
        renderBlock({ report: report(96), isLoading: false, isError: false });
        expect(screen.getByRole('heading', { name: t.rsvpStats.byCategory })).toBeTruthy();
        expect(screen.getByRole('heading', { name: t.rsvpReport.perSession })).toBeTruthy();
        expect(screen.getByText(/Church: 152 people/)).toBeTruthy();
    });

    it('says there are no responses yet', () => {
        renderBlock({ report: report(0), isLoading: false, isError: false });
        expect(screen.getByText(t.rsvpReport.empty)).toBeTruthy();
    });

    it('says when the report failed to load', () => {
        renderBlock({ report: null, isLoading: false, isError: true });
        expect(screen.getByText(t.rsvpReport.loadFailed)).toBeTruthy();
    });
});
