import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuidelinesAcceptanceGate } from '@/components/legal/GuidelinesAcceptanceGate';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({
    me: undefined as { guidelinesAcceptanceRequired: boolean | null; currentGuidelinesVersion: string | null } | undefined,
    mutate: vi.fn(),
    isPending: false,
    error: null as unknown,
    meFailed: false,
    pathname: '/home',
    logout: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({
    usePathname: () => mocks.pathname,
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: mocks.logout }) }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: mocks.me, isError: mocks.meFailed }) }));
vi.mock('@/hooks/useAcceptGuidelines', () => ({
    useAcceptGuidelines: () => ({ mutate: mocks.mutate, isPending: mocks.isPending, error: mocks.error }),
}));

describe('GuidelinesAcceptanceGate', () => {
    afterEach(() => {
        cleanup();
        mocks.me = undefined;
        mocks.error = null;
        mocks.meFailed = false;
        mocks.pathname = '/home';
        mocks.mutate.mockReset();
        mocks.logout.mockReset();
        mocks.replace.mockReset();
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

    // No extra wait on every load: the app shows until /api/me says otherwise.
    it('shows the app while /api/me is still loading', () => {
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    // The backend still enforces; a failed /api/me must not lock the app.
    it('shows the app when /api/me failed', () => {
        mocks.meFailed = true;
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    // The gate's own Read link opens /legal/community-guidelines in a new tab.
    it('leaves the guidelines page readable while acceptance is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/legal/community-guidelines';
        render(<GuidelinesAcceptanceGate>guidelines</GuidelinesAcceptanceGate>);

        expect(screen.getByText('guidelines')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'accept' })).not.toBeInTheDocument();
    });

    it('leaves the auth pages reachable while acceptance is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/login';
        render(<GuidelinesAcceptanceGate>login</GuidelinesAcceptanceGate>);

        expect(screen.getByText('login')).toBeInTheDocument();
    });

    // A path that merely starts with an ungated name is still gated.
    it('gates a path that only shares a prefix with an auth page', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/loginx';
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.queryByText('app')).not.toBeInTheDocument();
    });

    // Wrong account, or not willing to accept: never stuck behind the gate.
    it('signs out and goes to the login page', async () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.logout.mockResolvedValue(undefined);
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        fireEvent.click(screen.getByRole('button', { name: 'signOut' }));

        expect(mocks.logout).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
        expect(mocks.mutate).not.toHaveBeenCalled();
    });
});
