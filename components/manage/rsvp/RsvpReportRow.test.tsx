import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpReportRow } from '@/components/manage/rsvp/RsvpReportRow';
import messages from '@/messages/en.json';

afterEach(cleanup);

describe('RsvpReportRow', () => {
    it('opens the report page instead of downloading', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <RsvpReportRow eventId="e1" reportType="FULL_LIST" origin="manage" />
            </NextIntlClientProvider>,
        );

        const link = screen.getByRole('link', { name: /Full list/ });
        expect(link.getAttribute('href')).toBe('/events/e1/manage/rsvp/reports/FULL_LIST');
    });

    it('carries from=tools only when opened from the tools origin', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <RsvpReportRow eventId="e1" reportType="FULL_LIST" origin="tools" />
            </NextIntlClientProvider>,
        );

        const link = screen.getByRole('link', { name: /Full list/ });
        expect(link.getAttribute('href')).toBe('/events/e1/manage/rsvp/reports/FULL_LIST?from=tools');
    });
});
