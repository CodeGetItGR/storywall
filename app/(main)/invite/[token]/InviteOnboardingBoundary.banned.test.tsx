import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InviteOnboardingBoundary from '@/app/(main)/invite/[token]/InviteOnboardingBoundary';
import { ApiError } from '@/lib/api/client';
import type { EventInvitationPreviewDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({
    accept: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, isBootstrapping: false }) }));
vi.mock('@/hooks/useEventInvitations', () => ({
    useEventInvitationPreview: () => ({
        data: {
            eventTitle: 'Maria & Nikos',
            eventSubtitle: null,
            eventDescription: null,
            eventStartAt: '2027-06-12T18:00:00+03:00',
            eventEndAt: null,
            eventTimezone: 'Europe/Athens',
            eventLocationName: null,
            coverMedia: null,
            email: null,
            expired: false,
            alreadyUsed: false,
            gift: null,
        } as unknown as EventInvitationPreviewDto,
        isLoading: false,
        error: null,
    }),
    useAcceptEventInvitation: () => ({ mutateAsync: mocks.accept, isPending: false }),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InviteOnboardingBoundary', () => {
    it('tells a banned account it cannot join (4014) and stays on the invite', async () => {
        mocks.accept.mockRejectedValue(new ApiError(403, { errorCode: 4014 }));
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <InviteOnboardingBoundary token="tok" />
            </NextIntlClientProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'I have an account' }));

        expect(await screen.findByRole('alert')).toHaveTextContent("You can't join this event.");
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
