import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskDatesSheetFor } from '@/components/vendors/inquiries/AskDatesSheetFor';
import type { useAskDates } from '@/hooks/useAskDates';

const sheet = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null));
vi.mock('@/components/vendors/inquiries/AskDatesSheet', () => ({ AskDatesSheet: sheet }));

type Ask = ReturnType<typeof useAskDates>;

function makeAsk(overrides: Partial<Ask> = {}): Ask {
    return {
        target: { kind: 'vendor', vendorId: 'v1', name: 'Lens & Light' },
        openForVendor: vi.fn(),
        openForCard: vi.fn(),
        close: vi.fn(),
        date: '2027-06-12',
        setDate: vi.fn(),
        phone: '+30 690',
        setPhone: vi.fn(),
        email: 'maria@example.com',
        setEmail: vi.fn(),
        note: 'Summer',
        setNote: vi.fn(),
        consent: true,
        setConsent: vi.fn(),
        dateError: 'date',
        contactError: 'contact',
        sendError: 'send',
        sent: false,
        isSending: true,
        canSend: false,
        dateBounds: { min: '2026-11-23', max: '2029-11-23' },
        submit: vi.fn(),
        ...overrides,
    };
}

describe('AskDatesSheetFor', () => {
    afterEach(() => {
        cleanup();
        sheet.mockClear();
    });

    it('renders nothing until a partner is picked', () => {
        const { container } = render(<AskDatesSheetFor ask={makeAsk({ target: null })} />);
        expect(container).toBeEmptyDOMElement();
        expect(sheet).not.toHaveBeenCalled();
    });

    it('hands the ask state and actions to the sheet', () => {
        const ask = makeAsk();
        render(<AskDatesSheetFor ask={ask} />);
        expect(sheet.mock.calls[0][0]).toEqual({
            name: 'Lens & Light',
            date: ask.date,
            phone: ask.phone,
            email: ask.email,
            note: ask.note,
            consent: ask.consent,
            dateBounds: ask.dateBounds,
            dateError: ask.dateError,
            contactError: ask.contactError,
            sendError: ask.sendError,
            sent: ask.sent,
            isSending: ask.isSending,
            canSend: ask.canSend,
            onDateChangeAction: ask.setDate,
            onPhoneChangeAction: ask.setPhone,
            onEmailChangeAction: ask.setEmail,
            onNoteChangeAction: ask.setNote,
            onConsentChangeAction: ask.setConsent,
            onSubmitAction: ask.submit,
            onCloseAction: ask.close,
        });
    });
});
