import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SignupAcceptance } from '@/components/auth/OAuthSignupAcceptanceModal';
import { ApiError } from '@/lib/api/client';

import RegisterPage from './page';

type Version = { data: string | undefined; isPending: boolean; isError: boolean };
type OAuthButtonsProps = { onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>; onError: (error: unknown) => void };
type AcceptanceModalProps = { onConfirmAction: (acceptance: SignupAcceptance) => Promise<void> };

const mocks = vi.hoisted(() => ({
    register: vi.fn(),
    oauth: vi.fn(),
    navigateAfterSignIn: vi.fn(),
    version: { data: '2026-09-30', isPending: false, isError: false } as Version,
    termsVersion: { data: '2026-10-04', isPending: false, isError: false } as Version,
    oauthButtons: null as OAuthButtonsProps | null,
    acceptanceModal: null as AcceptanceModalProps | null,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/register', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ register: mocks.register, oauth: mocks.oauth }) }));
vi.mock('@/hooks/useAuthPageRedirect', () => ({ useAuthPageRedirect: () => ({ shouldRenderAuthPage: true }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppNewsletterConfig: () => null }));
vi.mock('@/components/invite/InviteEventCard', () => ({ InviteEventCard: () => null }));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => ({}) }));
vi.mock('@/hooks/useNavigateAfterSignIn', () => ({ useNavigateAfterSignIn: () => mocks.navigateAfterSignIn }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => mocks.version,
}));
vi.mock('@/hooks/useTermsVersion', () => ({
    termsVersionQueryKey: ['legal', 'terms'],
    useTermsVersion: () => mocks.termsVersion,
}));
vi.mock('@/components/auth/AuthLayout', () => ({ AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/auth/OAuthButtons', () => ({
    OAuthButtons: (props: OAuthButtonsProps) => {
        mocks.oauthButtons = props;
        return <div data-testid="oauth-buttons" />;
    },
}));
// The modal itself is covered by the login page test.
vi.mock('@/components/auth/OAuthSignupAcceptanceModal', () => ({
    OAuthSignupAcceptanceModal: (props: AcceptanceModalProps) => {
        mocks.acceptanceModal = props;
        return <div role="dialog" />;
    },
}));
// The checkbox copy and links are covered by SignupAcceptanceCheckbox.test.
vi.mock('@/components/legal/SignupAcceptanceCheckbox', () => ({
    SignupAcceptanceCheckbox: (props: { checked: boolean; onChangeAction: () => void }) => (
        <input type="checkbox" aria-label="acceptance" required checked={props.checked} onChange={props.onChangeAction} />
    ),
}));

const signupRequired = () =>
    new ApiError(400, { errorCode: 3044, details: { currentTermsVersion: '2026-10-04', currentGuidelinesVersion: '2026-09-30' } });

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    const view = render(
        <QueryClientProvider client={queryClient}>
            <RegisterPage />
        </QueryClientProvider>,
    );
    fireEvent.change(screen.getByPlaceholderText('placeholders.firstName'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText('placeholders.lastName'), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByPlaceholderText('placeholders.email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'correct-horse-battery' } });
    return { ...view, form: view.container.querySelector('form')! };
}

function tick() {
    fireEvent.click(screen.getByRole('checkbox', { name: 'acceptance' }));
}

describe('RegisterPage and the Terms / Community Guidelines acceptance', () => {
    beforeEach(() => {
        mocks.version = { data: '2026-09-30', isPending: false, isError: false };
        mocks.termsVersion = { data: '2026-10-04', isPending: false, isError: false };
        mocks.register.mockReset().mockResolvedValue({ role: 'USER' });
        mocks.oauth.mockReset().mockResolvedValue({ role: 'USER' });
        mocks.navigateAfterSignIn.mockReset();
        mocks.oauthButtons = null;
        mocks.acceptanceModal = null;
    });
    afterEach(cleanup);

    it('does not register while the box is unticked', () => {
        const { form } = renderPage();

        // The native `required` stops the button; submitting the form directly
        // skips that and reaches the page's own check.
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        fireEvent.submit(form);
        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.required');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('sends the fields, both versions in force and the 18+ confirmation once the box is ticked', async () => {
        const { form } = renderPage();

        tick();
        fireEvent.submit(form);

        await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
        expect(mocks.register).toHaveBeenCalledWith({
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            password: 'correct-horse-battery',
            inviteToken: undefined,
            subscribeToNewsletter: undefined,
            acceptedGuidelinesVersion: '2026-09-30',
            acceptedTermsVersion: '2026-10-04',
            adultConfirmed: true,
        });
        expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1);
    });

    it('asks for a moment, not a refresh, while a version is still loading', () => {
        mocks.termsVersion = { data: undefined, isPending: true, isError: false };
        const { form } = renderPage();

        tick();
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.loading');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('asks for a refresh when a version failed to load', () => {
        mocks.version = { data: undefined, isPending: false, isError: true };
        const { form } = renderPage();

        tick();
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.unavailable');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    // A newer version went live while the form was open.
    it.each([
        ['Community Guidelines', 3037],
        ['Terms of Use', 3043],
    ])('unticks the box, refetches both versions and explains when the %s changed', async (_, errorCode) => {
        mocks.register.mockRejectedValue(new ApiError(400, { errorCode }));
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { form } = renderPage(queryClient);

        tick();
        fireEvent.submit(form);

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('acceptance.changed'));
        expect(screen.getByRole('checkbox', { name: 'acceptance' })).not.toBeChecked();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'community-guidelines'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'terms'] });
        expect(mocks.navigateAfterSignIn).not.toHaveBeenCalled();
    });
});

describe('RegisterPage and a Google/Apple sign-up', () => {
    beforeEach(() => {
        mocks.oauth.mockReset();
        mocks.navigateAfterSignIn.mockReset();
        mocks.oauthButtons = null;
        mocks.acceptanceModal = null;
    });
    afterEach(cleanup);

    it('shows the Google and Apple buttons without ticking anything', () => {
        renderPage();

        expect(screen.getByTestId('oauth-buttons')).toBeInTheDocument();
    });

    it('signs an existing account straight in, with no acceptance', async () => {
        mocks.oauth.mockResolvedValue({ role: 'USER' });
        renderPage();

        await act(() => mocks.oauthButtons!.onSignIn('GOOGLE', 'google-id-token'));

        expect(mocks.oauth).toHaveBeenCalledWith('GOOGLE', { idToken: 'google-id-token', inviteToken: undefined });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1);
    });

    it('asks for the acceptance on a 3044, then resends the same token with it', async () => {
        mocks.oauth.mockRejectedValueOnce(signupRequired()).mockResolvedValueOnce({ role: 'USER' });
        renderPage();

        await act(() => mocks.oauthButtons!.onSignIn('GOOGLE', 'google-id-token'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(mocks.navigateAfterSignIn).not.toHaveBeenCalled();

        await act(() => mocks.acceptanceModal!.onConfirmAction({ acceptedTermsVersion: '2026-10-04', acceptedGuidelinesVersion: '2026-09-30' }));

        expect(mocks.oauth).toHaveBeenLastCalledWith('GOOGLE', {
            idToken: 'google-id-token',
            inviteToken: undefined,
            acceptedTermsVersion: '2026-10-04',
            acceptedGuidelinesVersion: '2026-09-30',
            adultConfirmed: true,
        });
        expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1);
    });
});
