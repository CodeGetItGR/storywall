import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PartnerPortalBoundary } from '@/components/partners/PartnerPortalBoundary';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({ portal: {} as Record<string, unknown>, post: vi.fn() }));

vi.mock('@/hooks/usePartnerPortal', () => ({ usePartnerPortal: () => mocks.portal }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { userId: 'u1', email: 'barn@venue.test' } }) }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: mocks.post },
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/partner', useRouter: () => ({ push: vi.fn() }) }));

function refused(errorCode: number) {
    return { isLoading: false, data: undefined, error: new ApiError(403, { errorCode }), refetch: vi.fn() };
}

function renderPortal() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <PartnerPortalBoundary />
        </NextIntlClientProvider>,
    );
}

describe('PartnerPortalBoundary', () => {
    beforeEach(() => mocks.post.mockResolvedValue(undefined));
    afterEach(cleanup);

    it('asks an unverified account to verify, and resends the email', async () => {
        mocks.portal = refused(ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED);
        renderPortal();

        expect(screen.getByRole('heading', { name: 'Verify your email to open your partner page' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

        expect(await screen.findByText('Email sent')).toBeInTheDocument();
        expect(mocks.post).toHaveBeenCalledWith(expect.any(String), { email: 'barn@venue.test' });
        expect(screen.queryByRole('button', { name: 'Resend email' })).toBeNull();
    });

    it('tells an account that is no partner, with a way to contact us', () => {
        mocks.portal = refused(ERROR_CODES.PARTNER_NOT_LINKED);
        renderPortal();

        expect(screen.getByRole('heading', { name: "This account isn't linked to a partner" })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    });

    it('offers a retry for any other failure', () => {
        mocks.portal = { isLoading: false, data: undefined, error: new ApiError(500, { errorCode: 9001 }), refetch: vi.fn() };
        renderPortal();

        expect(screen.getByRole('heading', { name: "Couldn't load your partner page" })).toBeInTheDocument();
    });
});
