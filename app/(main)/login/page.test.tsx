import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import messages from '@/messages/en.json';

import LoginPage from './page';

type OAuthButtonsProps = { onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>; onError: (error: unknown) => void };

const mocks = vi.hoisted(() => ({
    oauth: vi.fn(),
    navigateAfterSignIn: vi.fn(),
    termsVersion: '2026-10-04',
    guidelinesVersion: '2026-09-30',
    oauthButtons: null as OAuthButtonsProps | null,
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn(), oauth: mocks.oauth }) }));
vi.mock('@/hooks/useAuthPageRedirect', () => ({ useAuthPageRedirect: () => ({ shouldRenderAuthPage: true }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic error' }));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => ({}) }));
vi.mock('@/hooks/useNavigateAfterSignIn', () => ({ useNavigateAfterSignIn: () => mocks.navigateAfterSignIn }));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: (_open: boolean, onClose: () => void) => ({ requestClose: onClose }) }));
// The versions in force, as a refetch after a 3043 / 3037 would bring them.
vi.mock('@/hooks/useTermsVersion', () => ({
    termsVersionQueryKey: ['legal', 'terms'],
    useTermsVersion: () => ({ data: mocks.termsVersion }),
}));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: mocks.guidelinesVersion }),
}));
vi.mock('@/components/auth/AuthLayout', () => ({ AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/auth/OAuthButtons', () => ({
    OAuthButtons: (props: OAuthButtonsProps) => {
        mocks.oauthButtons = props;
        return null;
    },
}));

const signupRequired = () =>
    new ApiError(400, { errorCode: 3044, details: { currentTermsVersion: '2026-10-04', currentGuidelinesVersion: '2026-09-30' } });

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <LoginPage />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

async function signInWithGoogle() {
    await act(() => mocks.oauthButtons!.onSignIn('GOOGLE', 'google-id-token'));
}

function tickBoth(dialog: HTMLElement) {
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^I accept/ }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'I am 18 or older' }));
}

describe('LoginPage and a Google/Apple sign-in that would create an account', () => {
    beforeEach(() => {
        mocks.oauth.mockReset();
        mocks.navigateAfterSignIn.mockReset();
        mocks.termsVersion = '2026-10-04';
        mocks.guidelinesVersion = '2026-09-30';
        mocks.oauthButtons = null;
    });
    afterEach(cleanup);

    it('signs an existing account straight in, with no acceptance', async () => {
        mocks.oauth.mockResolvedValue({ role: 'USER' });
        renderPage();

        await signInWithGoogle();

        expect(mocks.oauth).toHaveBeenCalledWith('GOOGLE', { idToken: 'google-id-token', inviteToken: undefined });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1);
    });

    it('asks for the acceptance on a 3044, then resends the same token with it', async () => {
        mocks.oauth.mockRejectedValueOnce(signupRequired()).mockResolvedValueOnce({ role: 'USER' });
        renderPage();

        await signInWithGoogle();

        const dialog = screen.getByRole('dialog');
        const confirm = within(dialog).getByRole('button', { name: 'Create account' });
        expect(confirm).toBeDisabled();
        fireEvent.click(within(dialog).getByRole('checkbox', { name: /^I accept/ }));
        expect(confirm).toBeDisabled();
        fireEvent.click(within(dialog).getByRole('checkbox', { name: 'I am 18 or older' }));
        expect(confirm).toBeEnabled();

        fireEvent.click(confirm);

        await waitFor(() => expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1));
        expect(mocks.oauth).toHaveBeenLastCalledWith('GOOGLE', {
            idToken: 'google-id-token',
            inviteToken: undefined,
            acceptedTermsVersion: '2026-10-04',
            acceptedGuidelinesVersion: '2026-09-30',
            adultConfirmed: true,
        });
    });

    // A newer version went live between the 3044 and the confirm.
    it('refetches the versions and asks again when the resend meets a changed version', async () => {
        mocks.oauth
            .mockRejectedValueOnce(signupRequired())
            .mockRejectedValueOnce(new ApiError(400, { errorCode: 3043 }))
            .mockResolvedValueOnce({ role: 'USER' });
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        renderPage(queryClient);
        await signInWithGoogle();
        const dialog = screen.getByRole('dialog');
        tickBoth(dialog);
        mocks.termsVersion = '2026-11-01';

        fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

        await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('were just updated'));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'terms'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'community-guidelines'] });
        expect(within(dialog).getByRole('checkbox', { name: /^I accept/ })).not.toBeChecked();
        expect(within(dialog).getByRole('button', { name: 'Create account' })).toBeDisabled();
        expect(mocks.navigateAfterSignIn).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('checkbox', { name: /^I accept/ }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

        await waitFor(() => expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1));
        expect(mocks.oauth).toHaveBeenLastCalledWith(
            'GOOGLE',
            expect.objectContaining({ idToken: 'google-id-token', acceptedTermsVersion: '2026-11-01', adultConfirmed: true }),
        );
    });

    it('closes the modal on cancel without creating anything', async () => {
        mocks.oauth.mockRejectedValueOnce(signupRequired());
        renderPage();
        await signInWithGoogle();

        const cancels = within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Cancel' });
        fireEvent.click(cancels[cancels.length - 1]);

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(mocks.oauth).toHaveBeenCalledTimes(1);
    });

    // An expired Apple token, say: the page shows it and the user signs in again.
    it('closes the modal and shows any other failure of the resend', async () => {
        mocks.oauth.mockRejectedValueOnce(signupRequired()).mockRejectedValueOnce(new ApiError(401, { errorCode: 1004 }));
        renderPage();
        await signInWithGoogle();
        tickBoth(screen.getByRole('dialog'));

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create account' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toHaveTextContent('generic error');
    });

    it('leaves any other sign-in failure to the buttons', async () => {
        mocks.oauth.mockRejectedValue(new ApiError(401, { errorCode: 1004 }));
        renderPage();

        await expect(mocks.oauthButtons!.onSignIn('GOOGLE', 'google-id-token')).rejects.toBeInstanceOf(ApiError);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
