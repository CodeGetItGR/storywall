import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InquirySheet } from '@/components/business/InquirySheet';
import type { GuestInquiryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: '+30 690 000 0000',
    email: 'maria@example.com',
    note: 'Summer wedding',
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

function renderSheet(inquiry: GuestInquiryDto, onDone = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <InquirySheet inquiry={inquiry} isSaving={false} error={null} onSetDoneAction={onDone} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
    return onDone;
}

describe('InquirySheet', () => {
    afterEach(cleanup);

    it('shows the date, event, note and ways to reply', () => {
        renderSheet(ROW);
        expect(screen.getByText('Jun 12, 2027')).toBeInTheDocument();
        expect(screen.getByText('Anna & Nikos')).toBeInTheDocument();
        expect(screen.getByText('Summer wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+306900000000');
        expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:maria%40example.com');
    });

    it('keeps a typed email from adding mail headers', () => {
        renderSheet({ ...ROW, email: 'maria@example.com?cc=boss@example.com&body=hi' });
        const href = screen.getByRole('link', { name: /Email/ }).getAttribute('href');
        expect(href).toBe('mailto:maria%40example.com%3Fcc%3Dboss%40example.com%26body%3Dhi');
    });

    it('calls only the digits and plus of the phone', () => {
        renderSheet({ ...ROW, phone: '+30 690?body=x' });
        expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+30690');
    });

    it('leaves out a way to reply the guest did not give', () => {
        renderSheet({ ...ROW, phone: null });
        expect(screen.queryByRole('link', { name: /Call/ })).not.toBeInTheDocument();
    });

    it('marks done, and back to new', () => {
        const onDone = renderSheet(ROW);
        fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
        expect(onDone).toHaveBeenCalledWith(true);
        cleanup();
        const onNew = renderSheet({ ...ROW, status: 'DONE' });
        fireEvent.click(screen.getByRole('button', { name: 'Mark as new' }));
        expect(onNew).toHaveBeenCalledWith(false);
    });
});
