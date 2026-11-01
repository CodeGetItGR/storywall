import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessContactSheet } from '@/components/business/BusinessContactSheet';
import messages from '@/messages/en.json';

function renderSheet(overrides: Partial<Parameters<typeof BusinessContactSheet>[0]> = {}) {
    const props = {
        topic: null,
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
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessContactSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

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

    it('says where the reply goes once sent', () => {
        renderSheet({ sent: true });
        expect(screen.getByText("Sent. We'll reply to studio@example.com.")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });
});
