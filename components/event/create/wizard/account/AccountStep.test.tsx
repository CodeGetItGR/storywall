import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountStep } from '@/components/event/create/wizard/account/AccountStep';

const state = vi.hoisted(() => ({ view: 'choose', user: null as null | { userId: string } }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}`, useLocale: () => 'en' }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useCreateEventWizardAccount', () => ({
    useCreateEventWizardAccount: () => ({ view: state.view, open: vi.fn(), show: vi.fn(), onSignedIn: vi.fn() }),
}));
vi.mock('@/hooks/useCreateEventWizardAccountPreview', () => ({
    useCreateEventWizardAccountPreview: () => ({
        photoSrc: '/p.jpg',
        alt: 'Wedding',
        title: 'Anna & Kostas',
        titleIsPlaceholder: false,
        line: '12 Sep 2026 · STORY',
    }),
}));
vi.mock('@/hooks/useLoginForm', () => ({
    useLoginForm: () => ({ error: null, oauthSignIn: { pendingSignup: null }, handleOAuthSignIn: vi.fn(), handleOAuthError: vi.fn() }),
}));
vi.mock('@/hooks/useEmailCode', () => ({
    useEmailCode: () => ({
        email: 'anna@example.com',
        code: '',
        setCode: vi.fn(),
        verify: vi.fn(),
        resend: vi.fn(),
        changeEmail: vi.fn(),
        secondsLeft: 42,
        resent: false,
        isVerifying: false,
        isSending: false,
        errorKey: null,
        error: null,
    }),
}));
vi.mock('@/components/auth/OAuthButtons', () => ({ OAuthButtons: () => <div data-testid="oauth" /> }));
vi.mock('@/components/auth/RegisterEmailForm', () => ({ RegisterEmailForm: () => <form data-testid="register" /> }));
vi.mock('@/components/auth/LoginEmailForm', () => ({ LoginEmailForm: () => <form data-testid="login" /> }));
vi.mock('@/hooks/useRegisterForm', () => ({ useRegisterForm: () => ({ isSubmitting: false }) }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

describe('AccountStep', () => {
    it('offers Google first, then email sign-up and sign-in', () => {
        state.view = 'choose';
        state.user = null;
        render(<AccountStep />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.account.heading');
        expect(screen.getByTestId('oauth')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'RegisterPage.orWithEmail' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'RegisterPage.signInLink' })).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
    });

    it('shows the sign-up form', () => {
        state.view = 'signup';
        render(<AccountStep />);
        expect(screen.getByTestId('register')).toBeInTheDocument();
    });

    it('shows the sign-in form', () => {
        state.view = 'signin';
        state.user = null;
        render(<AccountStep />);
        expect(screen.getByTestId('login')).toBeInTheDocument();
    });

    it('shows the code screen with the email and the countdown', () => {
        state.view = 'code';
        state.user = { userId: 'u1' };
        render(<AccountStep />);
        expect(screen.getByText('CreateEventPage.wizard.code.line')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.code.resendIn' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.code.confirm' })).toBeDisabled();
    });
});
