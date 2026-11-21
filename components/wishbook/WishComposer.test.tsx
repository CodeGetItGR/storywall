import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WishComposer } from '@/components/wishbook/WishComposer';
import type { WishComposerState } from '@/hooks/useWishComposer';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

function composer(overrides: Partial<WishComposerState> = {}): WishComposerState {
    return {
        message: '',
        changeMessage: vi.fn(),
        recorder: { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn() },
        canSend: false,
        isSending: false,
        sendError: null,
        showSent: false,
        submit: vi.fn((event) => event.preventDefault()),
        ...overrides,
    };
}

afterEach(cleanup);

describe('WishComposer', () => {
    it('cannot send with nothing written or recorded', () => {
        render(<WishComposer composer={composer()} maxMessageLength={2000} />);
        expect(screen.getByRole('button', { name: 'addToWishbook' })).toBeDisabled();
    });

    it('writes and sends', () => {
        const c = composer({ message: 'Hi', canSend: true });
        render(<WishComposer composer={c} maxMessageLength={2000} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Hi there' } });
        fireEvent.click(screen.getByRole('button', { name: 'addToWishbook' }));

        expect(c.changeMessage).toHaveBeenCalled();
        expect(c.submit).toHaveBeenCalled();
    });

    it('offers the recorder', () => {
        const c = composer();
        render(<WishComposer composer={c} maxMessageLength={2000} />);

        fireEvent.click(screen.getByRole('button', { name: 'record' }));

        expect(c.recorder.start).toHaveBeenCalled();
    });

    it('plays back a recording before sending', () => {
        const recording = { blob: new Blob(), url: 'blob:x', durationMs: 42_000 };
        render(
            <WishComposer
                composer={composer({ canSend: true, recorder: { ...composer().recorder, status: 'recorded', recording } })}
                maxMessageLength={2000}
            />,
        );

        expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'addToWishbook' })).toBeEnabled();
    });

    it('shows a sending error', () => {
        render(<WishComposer composer={composer({ sendError: new Error('3131') })} maxMessageLength={2000} />);
        expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('shows the sent note in place of the form', () => {
        render(<WishComposer composer={composer({ showSent: true })} maxMessageLength={2000} />);

        expect(screen.getByText('wishSentTitle')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).toBeNull();
    });
});
