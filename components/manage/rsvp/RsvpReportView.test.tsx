import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpReportView } from '@/components/manage/rsvp/RsvpReportView';
import type { RsvpReportDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const header = { eventTitle: 'Anna & Nikos', eventTypeName: 'Wedding', eventDate: '2026-10-11', generatedAt: '2026-09-25T10:00:00Z' };
const totals = { responses: 3, people: 4, adults: 3, children: 1 };

function renderReport(report: RsvpReportDto) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <RsvpReportView report={report} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('RsvpReportView', () => {
    it('draws the statistics report', () => {
        renderReport({
            reportType: 'STATISTICS',
            header,
            totals,
            categories: [
                {
                    label: 'Ceremony + Reception',
                    attending: true,
                    comingSessionIds: ['c', 'r'],
                    noAnswerSessionIds: [],
                    responses: 1,
                    people: 3,
                    percentOfPeople: 75,
                },
                {
                    label: 'Only Ceremony',
                    attending: true,
                    comingSessionIds: ['c'],
                    noAnswerSessionIds: [],
                    responses: 1,
                    people: 1,
                    percentOfPeople: 25,
                },
                {
                    label: 'Not attending',
                    attending: false,
                    comingSessionIds: [],
                    noAnswerSessionIds: [],
                    responses: 1,
                    people: 0,
                    percentOfPeople: null,
                },
            ],
            sessions: [
                { sessionId: 'c', title: 'Ceremony', people: 4, noAnswerPeople: 0 },
                { sessionId: 'r', title: 'Reception', people: 3, noAnswerPeople: 1 },
            ],
            groups: null,
        });

        expect(screen.getByRole('heading', { name: 'Anna & Nikos' })).toBeTruthy();
        expect(screen.getByText('Wedding · October 11, 2026')).toBeTruthy();
        expect(screen.getByText('Statistics report')).toBeTruthy();
        expect(screen.getByText('3 people')).toBeTruthy();
        expect(screen.getByText('75%')).toBeTruthy();
        expect(screen.getByText('1 response')).toBeTruthy();
        expect(screen.getByText('Ceremony: 4 people')).toBeTruthy();
        expect(screen.getByText('Reception: 3 people · 1 no answer')).toBeTruthy();
        expect(screen.queryByText('Guest list by attendance')).toBeNull();
    });

    it('draws a list report grouped by attendance', () => {
        renderReport({
            reportType: 'FULL_LIST',
            header,
            totals,
            categories: null,
            sessions: null,
            groups: [
                {
                    label: 'Attending',
                    attending: true,
                    comingSessionIds: [],
                    noAnswerSessionIds: [],
                    responses: 1,
                    people: 3,
                    rows: [{ rsvpId: 'x', name: 'Maria', phone: null, adults: 2, children: 1, notes: 'Vegetarian' }],
                },
                {
                    label: 'Not attending',
                    attending: false,
                    comingSessionIds: [],
                    noAnswerSessionIds: [],
                    responses: 1,
                    people: 0,
                    rows: [{ rsvpId: 'y', name: 'Petros', phone: '6900000000', adults: 0, children: 0, notes: null }],
                },
            ],
        });

        expect(screen.getByText('Attending — 1 response / 3 people')).toBeTruthy();
        expect(screen.getByText('Not attending — 1 response')).toBeTruthy();
        const table = screen.getAllByRole('table')[0];
        expect(within(table).getByText('Full name')).toBeTruthy();
        expect(within(table).getByText('Maria')).toBeTruthy();
        expect(within(table).getByText('Vegetarian')).toBeTruthy();
        expect(screen.queryByText('Attendance by category')).toBeNull();
    });

    it('says so when a list is empty', () => {
        renderReport({ reportType: 'WITH_CHILDREN', header, totals, categories: null, sessions: null, groups: [] });

        expect(screen.getByText('No responses yet')).toBeTruthy();
    });
});
