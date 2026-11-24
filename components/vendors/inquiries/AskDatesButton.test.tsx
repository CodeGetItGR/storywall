import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskDatesButton } from '@/components/vendors/inquiries/AskDatesButton';
import messages from '@/messages/en.json';

function renderButton(sentAt: string | null, onAsk = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <AskDatesButton state={{ canAsk: sentAt === null, sentAt }} onAskAction={onAsk} />
        </NextIntlClientProvider>,
    );
    return onAsk;
}

describe('AskDatesButton', () => {
    afterEach(cleanup);

    it('opens the sheet', () => {
        const onAsk = renderButton(null);
        fireEvent.click(screen.getByRole('button', { name: 'Ask about my date' }));
        expect(onAsk).toHaveBeenCalled();
    });

    it('shows it was sent and does nothing', () => {
        renderButton('2026-11-23T10:00:00Z');
        expect(screen.getByRole('button', { name: 'Already sent' })).toBeDisabled();
    });
});
