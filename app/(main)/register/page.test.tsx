import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import RegisterPage from './page';

type Version = { data: string | undefined; isPending: boolean; isError: boolean };
type OAuthButtonsProps = { onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>; onError: (error: unknown) => void };

const mocks = vi.hoisted(() => ({
    register: vi.fn(),
    oauth: vi.fn(),
    navigateAfterSignIn: vi.fn(),
    version: { data: '2026-09-30', isPending: false, isError: false } as Version,
    termsVersion: { data: '2026-10-04', isPending: false, isError: false } as Version,
    oauthButtons: null as OAuthButtonsProps | null,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ register: mocks.register, oauth: mocks.oauth }) }));
vi.mock('@/hooks/useAuthPageRedirect', () => ({ useAuthPageRedirect: () => ({ shouldRenderAuthPage: true }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppNewsletterConfig: () => null }));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => ({}) }));
vi.mock('@/hooks/useNavigateAfterSignIn', () => ({ useNavigateAfterSignIn: () => mocks.navigateAfterSignIn }));
vi.mock('@/hooks/useRegisterBusinessProfile', () => ({
    useRegisterBusinessProfile: () => ({ prepareRequest: () => null, handleSignupError: () => false }),
}));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => mocks.version,
}));
vi.mock('@/hooks/useTermsVersion', () => ({
    termsVersionQueryKey: ['legal', 'terms'],
    useTermsVersion: () => mocks.termsVersion,
}));
// Layout and the other sections are not what this test is about.
vi.mock('@/components/auth/AuthLayout', () => ({ AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/auth/RegisterBusinessSection', () => ({ RegisterBusinessSection: () => null }));
// Stands in for Google's button, which can't be disabled: it must not be there at all until allowed.
vi.mock('@/components/auth/OAuthButtons', () => ({
    OAuthButtons: (props: OAuthButtonsProps) => {
        mocks.oauthButtons = props;
        return <div data-testid="oauth-buttons" />;
    },
}));
// The checkbox copy and links are covered by AcceptanceCheckboxes.test.
vi.mock('@/components/legal/AcceptanceCheckboxes', () => ({
    AcceptanceCheckboxes: (props: {
        accepted: boolean;
        adultConfirmed: boolean;
        onAcceptedChangeAction: () => void;
        onAdultConfirmedChangeAction: () => void;
    }) => (
        <>
            <input type="checkbox" aria-label="documents" required checked={props.accepted} onChange={props.onAcceptedChangeAction} />
            <input type="checkbox" aria-label="adult" required checked={props.adultConfirmed} onChange={props.onAdultConfirmedChangeAction} />
        </>
    ),
}));

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

function tickBoth() {
    fireEvent.click(screen.getByRole('checkbox', { name: 'documents' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'adult' }));
}

describe('RegisterPage and the Terms / Community Guidelines acceptance', () => {
    beforeEach(() => {
        mocks.version = { data: '2026-09-30', isPending: false, isError: false };
        mocks.termsVersion = { data: '2026-10-04', isPending: false, isError: false };
        mocks.register.mockReset().mockResolvedValue({ role: 'USER' });
        mocks.oauth.mockReset().mockResolvedValue({ role: 'USER' });
        mocks.navigateAfterSignIn.mockReset();
        mocks.oauthButtons = null;
    });
    afterEach(cleanup);

    it('does not register while either box is unticked', () => {
        const { form } = renderPage();

        // The native `required` stops the button; submitting the form directly
        // skips that and reaches the page's own check.
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        fireEvent.submit(form);
        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.required');

        // The documents alone are not enough: the 18+ box is required too.
        fireEvent.click(screen.getByRole('checkbox', { name: 'documents' }));
        fireEvent.submit(form);
        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.required');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('sends both versions in force and the 18+ confirmation once both boxes are ticked', async () => {
        const { form } = renderPage();

        tickBoth();
        fireEvent.submit(form);

        await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
        expect(mocks.register).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'ada@example.com',
                acceptedGuidelinesVersion: '2026-09-30',
                acceptedTermsVersion: '2026-10-04',
                adultConfirmed: true,
            }),
        );
    });

    it('asks for a moment, not a refresh, while a version is still loading', () => {
        mocks.termsVersion = { data: undefined, isPending: true, isError: false };
        const { form } = renderPage();

        tickBoth();
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('acceptance.loading');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('asks for a refresh when a version failed to load', () => {
        mocks.version = { data: undefined, isPending: false, isError: true };
        const { form } = renderPage();

        tickBoth();
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

        tickBoth();
        fireEvent.submit(form);

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('acceptance.changed'));
        expect(screen.getByRole('checkbox', { name: 'documents' })).not.toBeChecked();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'community-guidelines'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal', 'terms'] });
        expect(mocks.navigateAfterSignIn).not.toHaveBeenCalled();
    });

    // Until a sign-up through Google or Apple would carry the acceptance, a hint stands in.
    it('shows the Google and Apple buttons only once both boxes are ticked', () => {
        renderPage();

        expect(screen.queryByTestId('oauth-buttons')).not.toBeInTheDocument();
        expect(screen.getByText('acceptance.oauthHint')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'documents' }));
        expect(screen.queryByTestId('oauth-buttons')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'adult' }));
        expect(screen.getByTestId('oauth-buttons')).toBeInTheDocument();
        expect(screen.queryByText('acceptance.oauthHint')).not.toBeInTheDocument();
    });

    it('keeps the Google and Apple buttons hidden while a version is still loading', () => {
        mocks.termsVersion = { data: undefined, isPending: true, isError: false };
        renderPage();

        tickBoth();

        expect(screen.queryByTestId('oauth-buttons')).not.toBeInTheDocument();
        expect(screen.getByText('acceptance.loading')).toBeInTheDocument();
    });

    it('sends the acceptance with a Google sign-up', async () => {
        renderPage();
        tickBoth();

        await mocks.oauthButtons!.onSignIn('GOOGLE', 'google-id-token');

        expect(mocks.oauth).toHaveBeenCalledWith('GOOGLE', {
            idToken: 'google-id-token',
            inviteToken: undefined,
            acceptedGuidelinesVersion: '2026-09-30',
            acceptedTermsVersion: '2026-10-04',
            adultConfirmed: true,
        });
        expect(mocks.navigateAfterSignIn).toHaveBeenCalledTimes(1);
    });

    it('unticks the box and hides the buttons when a Google or Apple sign-up meets a changed version', async () => {
        renderPage();
        tickBoth();

        mocks.oauthButtons!.onError(new ApiError(400, { errorCode: 3043 }));

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('acceptance.changed'));
        expect(screen.getByRole('checkbox', { name: 'documents' })).not.toBeChecked();
        expect(screen.queryByTestId('oauth-buttons')).not.toBeInTheDocument();
    });
});
