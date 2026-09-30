import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import RegisterPage from './page';

const mocks = vi.hoisted(() => ({
    register: vi.fn(),
    navigateAfterSignIn: vi.fn(),
    version: { data: '2026-09-30' as string | undefined, isPending: false, isError: false },
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ register: mocks.register, oauth: vi.fn() }) }));
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
// Layout and the other sections are not what this test is about.
vi.mock('@/components/auth/AuthLayout', () => ({ AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/auth/OAuthButtons', () => ({ OAuthButtons: () => null }));
vi.mock('@/components/auth/RegisterBusinessSection', () => ({ RegisterBusinessSection: () => null }));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

describe('RegisterPage and the Community Guidelines', () => {
    beforeEach(() => {
        mocks.version = { data: '2026-09-30', isPending: false, isError: false };
        mocks.register.mockReset().mockResolvedValue({ role: 'USER' });
        mocks.navigateAfterSignIn.mockReset();
    });
    afterEach(cleanup);

    it('does not register while the box is unticked', () => {
        const { form } = renderPage();

        // The native `required` stops the button; submitting the form directly
        // skips that and reaches the page's own check.
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('guidelines.required');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('sends the version in force once the box is ticked', async () => {
        const { form } = renderPage();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.submit(form);

        await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
        expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com', acceptedGuidelinesVersion: '2026-09-30' }));
    });

    it('asks for a moment, not a refresh, while the version is still loading', () => {
        mocks.version = { data: undefined, isPending: true, isError: false };
        const { form } = renderPage();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('guidelines.loading');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('asks for a refresh when the version failed to load', () => {
        mocks.version = { data: undefined, isPending: false, isError: true };
        const { form } = renderPage();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.submit(form);

        expect(screen.getByRole('alert')).toHaveTextContent('guidelines.unavailable');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    // A newer version went live while the form was open.
    it('unticks the box and explains when the version changed', async () => {
        mocks.register.mockRejectedValue(new ApiError(400, { errorCode: 3037 }));
        const { form } = renderPage();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.submit(form);

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('guidelines.changed'));
        expect(screen.getByRole('checkbox')).not.toBeChecked();
        expect(mocks.navigateAfterSignIn).not.toHaveBeenCalled();
    });
});
