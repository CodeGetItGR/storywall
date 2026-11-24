import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';
import messages from '@/messages/en.json';

function renderSheet(overrides: Partial<ComponentProps<typeof AskDatesSheet>> = {}) {
    const props: ComponentProps<typeof AskDatesSheet> = {
        name: 'Lens & Light',
        date: '',
        phone: '',
        email: 'maria@example.com',
        note: '',
        consent: false,
        dateBounds: { min: '2026-11-23', max: '2029-11-23' },
        dateError: null,
        contactError: null,
        sendError: null,
        sent: false,
        isSending: false,
        canSend: false,
        onDateChangeAction: vi.fn(),
        onPhoneChangeAction: vi.fn(),
        onEmailChangeAction: vi.fn(),
        onNoteChangeAction: vi.fn(),
        onConsentChangeAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <AskDatesSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('AskDatesSheet', () => {
    afterEach(cleanup);

    it('keeps Send off until the guest agrees to share their details', () => {
        renderSheet();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Share my name and contact details with Lens & Light.' })).not.toBeChecked();
    });

    it('limits the date to today and three years ahead', () => {
        renderSheet();
        const date = screen.getByLabelText('Your event date');
        expect(date).toHaveAttribute('min', '2026-11-23');
        expect(date).toHaveAttribute('max', '2029-11-23');
    });

    it('sends', () => {
        const props = renderSheet({ consent: true, canSend: true, date: '2027-06-12' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(props.onSubmitAction).toHaveBeenCalled();
    });

    it('shows field errors next to their fields', () => {
        renderSheet({ dateError: 'Pick a date.', contactError: 'Add a phone or an email.' });
        expect(screen.getByLabelText('Your event date')).toHaveAccessibleDescription('Pick a date.');
        expect(screen.getByText('Add a phone or an email.')).toBeInTheDocument();
    });

    it('replaces the form with a confirmation once sent', () => {
        renderSheet({ sent: true });
        expect(screen.getByRole('status')).toHaveTextContent('Sent. Lens & Light will contact you.');
        expect(screen.getByRole('img', { name: 'Inquiry sent' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });
});
