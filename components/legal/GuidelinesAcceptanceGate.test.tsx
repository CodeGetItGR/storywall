import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuidelinesAcceptanceGate } from '@/components/legal/GuidelinesAcceptanceGate';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({
    me: undefined as { guidelinesAcceptanceRequired: boolean | null; currentGuidelinesVersion: string | null } | undefined,
    isLoading: false,
    mutate: vi.fn(),
    isPending: false,
    error: null as unknown,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: mocks.me, isLoading: mocks.isLoading }) }));
vi.mock('@/hooks/useAcceptGuidelines', () => ({
    useAcceptGuidelines: () => ({ mutate: mocks.mutate, isPending: mocks.isPending, error: mocks.error }),
}));
vi.mock('@/components/layout/AuthLoadingState', () => ({ AuthLoadingState: () => <div>loading</div> }));

describe('GuidelinesAcceptanceGate', () => {
    afterEach(() => {
        cleanup();
        mocks.me = undefined;
        mocks.isLoading = false;
        mocks.error = null;
        mocks.mutate.mockReset();
    });

    it('shows the app when nothing is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: false, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    it('replaces the app with the acceptance screen when required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'read' })).toHaveAttribute('href', '/legal/community-guidelines');
    });

    it('accepts the version /api/me reported', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        expect(mocks.mutate).toHaveBeenCalledWith('2026-09-30');
    });

    it('asks for a re-read when the version changed under the user', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.error = new ApiError(400, { errorCode: 3037 });
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByRole('alert')).toHaveTextContent('changed');
    });

    it('shows a loading state before /api/me first answers', () => {
        mocks.isLoading = true;
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByText('loading')).toBeInTheDocument();
    });

    // The backend still enforces; a failed /api/me must not lock the app.
    it('shows the app when /api/me failed', () => {
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByText('app')).toBeInTheDocument();
    });
});
