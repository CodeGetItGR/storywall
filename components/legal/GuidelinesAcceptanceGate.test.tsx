import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuidelinesAcceptanceGate, GuidelinesGateSignOutHold } from '@/components/legal/GuidelinesAcceptanceGate';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({
    me: undefined as
        | {
              guidelinesAcceptanceRequired: boolean | null;
              currentGuidelinesVersion: string | null;
              termsAcceptanceRequired?: boolean | null;
              currentTermsVersion?: string | null;
          }
        | undefined,
    mutate: vi.fn(),
    isPending: false,
    error: null as unknown,
    termsMutate: vi.fn(),
    termsError: null as unknown,
    pathname: '/home',
    logout: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }) }));
vi.mock('next/navigation', () => ({
    usePathname: () => mocks.pathname,
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: mocks.logout }) }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: mocks.me }) }));
vi.mock('@/hooks/useAcceptGuidelines', () => ({
    useAcceptGuidelines: () => ({ mutateAsync: mocks.mutate, isPending: mocks.isPending, error: mocks.error }),
}));
vi.mock('@/hooks/useAcceptTerms', () => ({
    useAcceptTerms: () => ({ mutateAsync: mocks.termsMutate, isPending: false, error: mocks.termsError }),
}));

describe('GuidelinesAcceptanceGate', () => {
    afterEach(() => {
        cleanup();
        mocks.me = undefined;
        mocks.error = null;
        mocks.termsError = null;
        mocks.pathname = '/home';
        mocks.mutate.mockReset();
        mocks.termsMutate.mockReset();
        mocks.logout.mockReset();
        mocks.replace.mockReset();
    });

    it('shows the app when nothing is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: false, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    it('replaces the app with the acceptance screen when required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'read opensInNewTab' })).toHaveAttribute('href', '/legal/community-guidelines');
    });

    it('does not block the public content notice form', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/report-content';
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    it('accepts the version /api/me reported', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        expect(mocks.mutate).toHaveBeenCalledWith('2026-09-30');
    });

    it('asks for a re-read when the version changed under the user', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.error = new ApiError(400, { errorCode: 3037 });
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByRole('alert')).toHaveTextContent('changed');
    });

    // No extra wait on every load: the app shows until /api/me says otherwise.
    it('shows the app while /api/me is still loading', () => {
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    // The backend still enforces; no /api/me data (e.g. it failed) must not lock the app.
    it('shows the app when there is no /api/me data', () => {
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    // The gate's own Read link opens /legal/community-guidelines in a new tab.
    it('leaves the guidelines page readable while acceptance is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/legal/community-guidelines';
        render(<GuidelinesAcceptanceGate>guidelines</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('guidelines')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'accept' })).not.toBeInTheDocument();
    });

    it('leaves the auth pages reachable while acceptance is required', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/login';
        render(<GuidelinesAcceptanceGate>login</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('login')).toBeInTheDocument();
    });

    it('leaves pages below an auth page reachable', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/login/x';
        render(<GuidelinesAcceptanceGate>login</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('login')).toBeInTheDocument();
    });

    // Only pages under /legal/ are exempt, not a bare /legal.
    it('gates a bare /legal', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/legal';
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.queryByText('app')).not.toBeInTheDocument();
    });

    // A path that merely starts with an ungated name is still gated.
    it('gates a path that only shares a prefix with an auth page', () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.pathname = '/loginx';
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.queryByText('app')).not.toBeInTheDocument();
    });

    // Wrong account, or not willing to accept: never stuck behind the gate.
    it('signs out and goes to the login page', async () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.logout.mockResolvedValue(undefined);
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        fireEvent.click(screen.getByRole('button', { name: 'signOut' }));

        expect(mocks.logout).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    // logout() clears /api/me at once; the hidden page must not flash before the redirect.
    it('keeps the gate up while signing out, until the login page loads', async () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.logout.mockImplementation(async () => {
            mocks.me = undefined;
        });
        const { rerender } = render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        fireEvent.click(screen.getByRole('button', { name: 'signOut' }));
        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
        rerender(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);

        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'signOut' })).toBeInTheDocument();

        mocks.pathname = '/login';
        rerender(<GuidelinesAcceptanceGate>login</GuidelinesAcceptanceGate>);
        expect(screen.getByText('login')).toBeInTheDocument();

        // Back on the page it started from, signed out: nothing is held any more.
        mocks.pathname = '/home';
        rerender(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);
        expect(screen.getByText('app')).toBeInTheDocument();
    });

    // Logout remounts everything under the composer, the gate included (AppProviders).
    it('keeps holding after the gate remounts during sign-out', async () => {
        mocks.me = { guidelinesAcceptanceRequired: true, currentGuidelinesVersion: '2026-09-30' };
        mocks.logout.mockImplementation(async () => {
            mocks.me = undefined;
        });
        const { rerender } = render(<GuidelinesAcceptanceGate key="u1">app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        fireEvent.click(screen.getByRole('button', { name: 'signOut' }));
        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
        rerender(<GuidelinesAcceptanceGate key="signed-out">app</GuidelinesAcceptanceGate>);

        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'signOut' })).toBeInTheDocument();
    });
});

describe('GuidelinesAcceptanceGate and the Terms of Use', () => {
    const termsOnly = {
        guidelinesAcceptanceRequired: false,
        currentGuidelinesVersion: '2026-09-30',
        termsAcceptanceRequired: true,
        currentTermsVersion: '2026-10-04',
    };
    const both = { ...termsOnly, guidelinesAcceptanceRequired: true };

    afterEach(() => {
        cleanup();
        mocks.me = undefined;
        mocks.error = null;
        mocks.termsError = null;
        mocks.pathname = '/home';
        mocks.mutate.mockReset();
        mocks.termsMutate.mockReset();
    });

    function tickBoth() {
        fireEvent.click(screen.getByLabelText(/^(termsOnly|all)$/));
        fireEvent.click(screen.getByLabelText('adult'));
    }

    it('shows the app when the Terms are accepted', () => {
        mocks.me = { ...termsOnly, termsAcceptanceRequired: false };
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('app')).toBeInTheDocument();
    });

    it('asks for the Terms and the 18+ confirmation, and accepts only once both are ticked', async () => {
        mocks.me = termsOnly;
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByRole('heading')).toHaveTextContent('terms.title');
        // Terms and Privacy only: the Guidelines are not owed.
        expect(screen.getByLabelText('termsOnly')).toBeInTheDocument();
        const accept = screen.getByRole('button', { name: 'accept' });
        expect(accept).toBeDisabled();
        fireEvent.click(screen.getByLabelText('termsOnly'));
        expect(accept).toBeDisabled();
        fireEvent.click(screen.getByLabelText('adult'));
        expect(accept).toBeEnabled();

        fireEvent.click(accept);

        await waitFor(() => expect(mocks.termsMutate).toHaveBeenCalledWith('2026-10-04'));
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('asks for a re-read when the Terms changed under the user', () => {
        mocks.me = termsOnly;
        mocks.termsError = new ApiError(400, { errorCode: 3043 });
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByRole('alert')).toHaveTextContent('terms.changed');
    });

    it('says any other failure failed', () => {
        mocks.me = termsOnly;
        mocks.termsError = new ApiError(500, { errorCode: 9001 });
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByRole('alert')).toHaveTextContent('failed');
    });

    it('asks for both on one screen and posts the Guidelines, then the Terms', async () => {
        mocks.me = both;
        const order: string[] = [];
        mocks.mutate.mockImplementation(async () => order.push('guidelines'));
        mocks.termsMutate.mockImplementation(async () => order.push('terms'));
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByRole('heading')).toHaveTextContent('combined.title');
        expect(screen.getByLabelText('all')).toBeInTheDocument();
        tickBoth();
        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        await waitFor(() => expect(order).toEqual(['guidelines', 'terms']));
        expect(mocks.mutate).toHaveBeenCalledWith('2026-09-30');
        expect(mocks.termsMutate).toHaveBeenCalledWith('2026-10-04');
    });

    it('does not post the Terms when the Guidelines fail', async () => {
        mocks.me = both;
        mocks.mutate.mockRejectedValue(new ApiError(500, { errorCode: 9001 }));
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        tickBoth();
        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(mocks.termsMutate).not.toHaveBeenCalled();
    });

    // The Guidelines went through and the Terms did not: /api/me now owes only the Terms.
    it('retries only what is still owed', async () => {
        mocks.me = both;
        mocks.termsMutate.mockRejectedValueOnce(new ApiError(500, { errorCode: 9001 }));
        const { rerender } = render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });
        tickBoth();
        fireEvent.click(screen.getByRole('button', { name: 'accept' }));
        await waitFor(() => expect(mocks.termsMutate).toHaveBeenCalledTimes(1));

        mocks.me = termsOnly;
        mocks.termsError = new ApiError(500, { errorCode: 9001 });
        rerender(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>);
        expect(screen.getByRole('alert')).toHaveTextContent('failed');
        // The boxes stay ticked across the switch to the Terms-only screen.
        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        await waitFor(() => expect(mocks.termsMutate).toHaveBeenCalledTimes(2));
        expect(mocks.mutate).toHaveBeenCalledTimes(1);
    });

    // A newer version needs a fresh tick of the documents box.
    it('unticks the documents box when the version changed', async () => {
        mocks.me = termsOnly;
        mocks.termsMutate.mockRejectedValue(new ApiError(400, { errorCode: 3043 }));
        render(<GuidelinesAcceptanceGate>app</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        tickBoth();
        fireEvent.click(screen.getByRole('button', { name: 'accept' }));

        await waitFor(() => expect(screen.getByLabelText('termsOnly')).not.toBeChecked());
        expect(screen.getByLabelText('adult')).toBeChecked();
    });

    it('leaves the Terms page readable while acceptance is required', () => {
        mocks.me = termsOnly;
        mocks.pathname = '/legal/terms';
        render(<GuidelinesAcceptanceGate>terms</GuidelinesAcceptanceGate>, { wrapper: GuidelinesGateSignOutHold });

        expect(screen.getByText('terms')).toBeInTheDocument();
    });
});
