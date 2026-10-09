import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import InviteOnboardingBoundary from './InviteOnboardingBoundary';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    accept: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, isBootstrapping: false }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error copy' }));
vi.mock('@/hooks/useEventInvitations', () => ({
    useEventInvitationPreview: () => ({
        data: { inviteToken: 'tok', eventId: 'event-1', eventTitle: 'Party', expired: false, alreadyUsed: false, gift: null },
        isLoading: false,
        error: null,
    }),
    useAcceptEventInvitation: () => ({ mutateAsync: mocks.accept, isPending: false }),
}));
vi.mock('@/components/invite/InviteLayout', () => ({ InviteLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/invite/InviteOnboardingState', () => ({
    InviteOnboardingState: ({ terminalState, content }: { terminalState: ReactNode; content: ReactNode }) => <div>{terminalState ?? content}</div>,
}));

describe('InviteOnboardingBoundary accepting as a signed-in user', () => {
    beforeEach(() => {
        mocks.replace.mockReset();
        mocks.accept.mockReset();
    });
    afterEach(cleanup);

    it('opens the event once accepted', async () => {
        mocks.accept.mockResolvedValue({ eventId: 'event-1' });
        render(<InviteOnboardingBoundary token="tok" />);

        fireEvent.click(screen.getByRole('button', { name: /haveAccount/ }));

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/events/event-1/feed'));
    });

    // A member reopening the shared join link: they're already in, so this is not an error.
    it('opens the event when the caller is already a member (409/5001)', async () => {
        mocks.accept.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5001 }));
        render(<InviteOnboardingBoundary token="tok" />);

        fireEvent.click(screen.getByRole('button', { name: /haveAccount/ }));

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/events/event-1/feed'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows the reason when the link is full (409/5035)', async () => {
        mocks.accept.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5035 }));
        render(<InviteOnboardingBoundary token="tok" />);

        fireEvent.click(screen.getByRole('button', { name: /haveAccount/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent('error copy');
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
