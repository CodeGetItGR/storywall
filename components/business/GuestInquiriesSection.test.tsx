import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuestInquiriesSection } from '@/components/business/GuestInquiriesSection';
import type { GuestInquiryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: '+30 690 000 0000',
    email: null,
    note: 'Summer wedding',
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

function renderSection(overrides: Partial<ComponentProps<typeof GuestInquiriesSection>> = {}) {
    const props: ComponentProps<typeof GuestInquiriesSection> = {
        partner: true,
        inquiries: [ROW, { ...ROW, id: 'q2', guestName: 'Nikos K', status: 'DONE' }],
        isLoading: false,
        loadFailed: false,
        hasMore: false,
        isLoadingMore: false,
        onOpenAction: vi.fn(),
        onLoadMoreAction: vi.fn(),
        onRetryAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <GuestInquiriesSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('GuestInquiriesSection', () => {
    afterEach(cleanup);

    it('lists inquiries with a New badge only on new ones, and opens one', () => {
        const props = renderSection();
        expect(screen.getAllByText('New')).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: /Maria P/ }));
        expect(props.onOpenAction).toHaveBeenCalledWith('q1');
    });

    it('says when there are none', () => {
        renderSection({ inquiries: [] });
        expect(screen.getByText('No inquiries yet')).toBeInTheDocument();
    });

    it('offers a retry when the list failed', () => {
        const props = renderSection({ inquiries: [], loadFailed: true });
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(props.onRetryAction).toHaveBeenCalled();
    });

    it('shows a locked sample to a non-partner, with nothing to tap', () => {
        renderSection({ partner: false, inquiries: [] });
        // The title names the section once; the lock only says who it is for.
        expect(screen.getAllByText('Guest inquiries')).toHaveLength(1);
        expect(screen.getByText('For partners')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Maria/ })).not.toBeInTheDocument();
    });
});
