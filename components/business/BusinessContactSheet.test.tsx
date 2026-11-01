import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessContactSheet } from '@/components/business/BusinessContactSheet';
import messages from '@/messages/en.json';

function renderSheet(overrides: Partial<Parameters<typeof BusinessContactSheet>[0]> = {}) {
    const props = {
        topic: null as Parameters<typeof BusinessContactSheet>[0]['topic'],
        message: '',
        topicError: null,
        messageError: null,
        sendError: null,
        sent: false,
        isSending: false,
        replyEmail: 'studio@example.com',
        onTopicChangeAction: vi.fn(),
        onMessageChangeAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    const view = render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessContactSheet {...props} />
        </NextIntlClientProvider>,
    );
    // The sheet is already open when a send ends, so a change of state comes as a rerender.
    const update = (next: Partial<Parameters<typeof BusinessContactSheet>[0]>) =>
        view.rerender(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                <BusinessContactSheet {...props} {...next} />
            </NextIntlClientProvider>,
        );
    return { ...props, update };
}

// Lets the dialog finish moving focus in on open.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('BusinessContactSheet', () => {
    afterEach(cleanup);

    it('picks a topic and sends', () => {
        const props = renderSheet({ topic: 'QUESTION', message: 'Hi' });
        fireEvent.click(screen.getByRole('radio', { name: 'Problem' }));
        expect(props.onTopicChangeAction).toHaveBeenCalledWith('PROBLEM');
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(props.onSubmitAction).toHaveBeenCalled();
    });

    it('moves the topic with the arrow keys', () => {
        const props = renderSheet({ topic: 'QUESTION' });
        fireEvent.keyDown(screen.getByRole('radiogroup', { name: 'Topic' }), { key: 'ArrowRight' });
        expect(props.onTopicChangeAction).toHaveBeenCalledWith('PROBLEM');
    });

    it('shows the errors', () => {
        renderSheet({ topicError: 'Pick a topic.', messageError: 'Write a message.', sendError: 'Try again.' });
        expect(screen.getByText('Pick a topic.')).toBeInTheDocument();
        expect(screen.getByText('Write a message.')).toBeInTheDocument();
        expect(screen.getByText('Try again.')).toBeInTheDocument();
    });

    it('says where the reply goes once sent, and moves focus to it', async () => {
        const { update } = renderSheet({ topic: 'QUESTION', message: 'Hi', isSending: true });
        await settle();
        update({ topic: 'QUESTION', message: 'Hi', sent: true });
        const status = screen.getByText("Sent. We'll reply to studio@example.com.");
        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
        await waitFor(() => expect(status).toHaveFocus());
    });

    it('leaves out the address when there is none', () => {
        renderSheet({ sent: true, replyEmail: null });
        expect(screen.getByText("Sent. We'll reply by email.")).toBeInTheDocument();
        expect(screen.queryByText(/reply to/)).not.toBeInTheDocument();
    });

    it('moves focus to the error when sending failed', async () => {
        const { update } = renderSheet({ topic: 'QUESTION', message: 'Hi', isSending: true });
        await settle();
        update({ topic: 'QUESTION', message: 'Hi', sendError: 'Try again.' });
        await waitFor(() => expect(screen.getByText('Try again.')).toHaveFocus());
    });

    it("can't be closed while sending", async () => {
        const props = renderSheet({ topic: 'QUESTION', message: 'Hi', isSending: true });
        expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        await settle();
        expect(props.onCloseAction).not.toHaveBeenCalled();
    });

    it('can be closed with Escape otherwise', async () => {
        const props = renderSheet({ topic: 'QUESTION', message: 'Hi' });
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        await waitFor(() => expect(props.onCloseAction).toHaveBeenCalled());
    });
});
