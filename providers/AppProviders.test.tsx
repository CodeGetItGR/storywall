import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';

const mocks = vi.hoisted(() => ({
    gated: false,
    pathname: '/home',
    user: { userId: 'u1' } as { userId: string } | null,
    passThrough: ({ children }: { children: unknown }) => children,
}));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useVisualViewportSync', () => ({ useVisualViewportSync: () => undefined }));
vi.mock('@/providers/AppConfigBootstrap', () => ({ AppConfigBootstrap: () => null }));
vi.mock('@/providers/DocumentTitleSync', () => ({ DocumentTitleSync: () => null }));
vi.mock('@/components/betaFeedback/BetaFeedback', () => ({ BetaFeedback: () => null }));
vi.mock('@/providers/AuthProvider', () => ({ AuthProvider: mocks.passThrough }));
vi.mock('@/providers/EventProvider', () => ({ EventProvider: mocks.passThrough }));
vi.mock('@/providers/MobileChromeProvider', () => ({ MobileChromeProvider: mocks.passThrough }));
vi.mock('@/providers/ModalProvider', () => ({ ModalProvider: mocks.passThrough }));
// Stands in for the in-memory publish queue: its state is lost if it unmounts.
vi.mock('@/providers/ComposerProvider', () => ({
    ComposerProvider: function ComposerProvider({ children }: { children: ReactNode }) {
        const [queued, setQueued] = useState(0);
        const handleQueue = useCallback(() => setQueued((n) => n + 1), []);
        return (
            <>
                <button type="button" onClick={handleQueue}>
                    queue
                </button>
                <p>queued {queued}</p>
                {children}
            </>
        );
    },
}));
vi.mock('@/components/legal/GuidelinesAcceptanceGate', () => ({
    GuidelinesGateSignOutHold: mocks.passThrough,
    GuidelinesAcceptanceGate: ({ children }: { children: ReactNode }) => (mocks.gated ? <p>gate</p> : children),
}));

describe('AppProviders and the guidelines gate', () => {
    afterEach(() => {
        cleanup();
        mocks.gated = false;
        mocks.pathname = '/home';
        mocks.user = { userId: 'u1' };
    });

    function queueOne() {
        fireEvent.click(screen.getByRole('button', { name: 'queue' }));
        expect(screen.getByText('queued 1')).toBeInTheDocument();
    }

    // A 4013 mid-session must not throw away queued (or failed, retryable) uploads.
    it('keeps the publish queue mounted while the gate opens and closes', () => {
        const { rerender } = render(<AppProviders>page</AppProviders>);
        queueOne();

        mocks.gated = true;
        rerender(<AppProviders>page</AppProviders>);
        expect(screen.getByText('gate')).toBeInTheDocument();
        expect(screen.queryByText('page')).not.toBeInTheDocument();

        mocks.gated = false;
        rerender(<AppProviders>page</AppProviders>);
        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.getByText('queued 1')).toBeInTheDocument();
    });

    // Shared device: the next person must not see the last one's draft or queue.
    it('starts the composer fresh once the user signs out from the gate', () => {
        const { rerender } = render(<AppProviders>page</AppProviders>);
        queueOne();

        mocks.gated = true;
        rerender(<AppProviders>page</AppProviders>);
        mocks.gated = false;
        mocks.user = null;
        rerender(<AppProviders>page</AppProviders>);

        expect(screen.getByText('queued 0')).toBeInTheDocument();
    });

    it('starts the composer fresh when another account signs in', () => {
        const { rerender } = render(<AppProviders>page</AppProviders>);
        queueOne();

        mocks.user = { userId: 'u2' };
        rerender(<AppProviders>page</AppProviders>);

        expect(screen.getByText('queued 0')).toBeInTheDocument();
    });

    // Bootstrap resolves from no user to a user; a token refresh brings a new object, same id.
    it('keeps the composer across sign-in and token refresh', () => {
        mocks.user = null;
        const { rerender } = render(<AppProviders>page</AppProviders>);
        queueOne();

        mocks.user = { userId: 'u1' };
        rerender(<AppProviders>page</AppProviders>);
        mocks.user = { userId: 'u1' };
        rerender(<AppProviders>page</AppProviders>);

        expect(screen.getByText('queued 1')).toBeInTheDocument();
    });

    // /demo has no composer, but the gate must still cover it.
    it('gates the demo pages too', () => {
        mocks.pathname = '/demo';
        mocks.gated = true;
        render(<AppProviders>page</AppProviders>);

        expect(screen.queryByRole('button', { name: 'queue' })).not.toBeInTheDocument();
        expect(screen.getByText('gate')).toBeInTheDocument();
        expect(screen.queryByText('page')).not.toBeInTheDocument();
    });
});
