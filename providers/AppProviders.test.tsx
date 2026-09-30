import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/providers/AppProviders';

const mocks = vi.hoisted(() => ({
    gated: false,
    passThrough: ({ children }: { children: unknown }) => children,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
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
    GuidelinesAcceptanceGate: ({ children }: { children: ReactNode }) => (mocks.gated ? <p>gate</p> : children),
}));

describe('AppProviders and the guidelines gate', () => {
    afterEach(() => {
        cleanup();
        mocks.gated = false;
    });

    // A 4013 mid-session must not throw away queued (or failed, retryable) uploads.
    it('keeps the publish queue mounted while the gate opens and closes', () => {
        const { rerender } = render(<AppProviders>page</AppProviders>);
        fireEvent.click(screen.getByRole('button', { name: 'queue' }));
        expect(screen.getByText('queued 1')).toBeInTheDocument();

        mocks.gated = true;
        rerender(<AppProviders>page</AppProviders>);
        expect(screen.getByText('gate')).toBeInTheDocument();
        expect(screen.queryByText('page')).not.toBeInTheDocument();

        mocks.gated = false;
        rerender(<AppProviders>page</AppProviders>);
        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.getByText('queued 1')).toBeInTheDocument();
    });
});
