import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessEarnings } from '@/components/business/BusinessEarnings';
import type { PartnerTierProgressDto } from '@/lib/api/types';
import type { BusinessEarnings as Earnings } from '@/lib/business';
import messages from '@/messages/en.json';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: (...args: unknown[]) => post(...args) },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'venue@example.com' } }) }));

const TIER = { currentPercent: 20, activationsThisYear: 3, nextTierMinActivations: 10, nextTierPercent: 25 } as PartnerTierProgressDto;

function renderEarnings(earnings: Earnings) {
    const props = { onRetryAction: vi.fn(), onContactAction: vi.fn() };
    const { container } = render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessEarnings earnings={earnings} {...props} />
        </NextIntlClientProvider>,
    );
    return { ...props, container };
}

describe('BusinessEarnings', () => {
    beforeEach(() => post.mockReset());
    afterEach(cleanup);

    it('shows nothing for a non-partner or while it loads', () => {
        expect(renderEarnings({ state: 'hidden' }).container).toBeEmptyDOMElement();
        cleanup();
        expect(renderEarnings({ state: 'loading' }).container).toBeEmptyDOMElement();
    });

    it('shows what is owed and the commission', () => {
        renderEarnings({ state: 'ready', balances: [{ currency: 'EUR', earnedMinor: 5000, paidMinor: 2000, owedMinor: 3000 }], tierProgress: TIER });
        expect(screen.getByText('To be paid')).toBeInTheDocument();
        expect(screen.getByText('Commission rate')).toBeInTheDocument();
    });

    it('offers a retry when the partner data failed', () => {
        const { onRetryAction } = renderEarnings({ state: 'failed' });
        expect(screen.getByText("Couldn't load your earnings.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetryAction).toHaveBeenCalledTimes(1);
    });

    it('asks an unverified partner to verify, and sends the email again', async () => {
        post.mockResolvedValue(undefined);
        renderEarnings({ state: 'notVerified' });
        expect(screen.getByText('Verify your email to see your earnings.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));
        await waitFor(() => expect(screen.getByText('Email sent')).toBeInTheDocument());
        expect(post).toHaveBeenCalledWith(expect.any(String), { email: 'venue@example.com' });
        expect(screen.queryByRole('button', { name: 'Resend email' })).toBeNull();
    });

    it('tells an account that is not linked to a partner, with a way to contact us', () => {
        const { onContactAction } = renderEarnings({ state: 'notLinked' });
        expect(screen.getByText("This account isn't linked to a partner.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Contact us' }));
        expect(onContactAction).toHaveBeenCalledTimes(1);
    });
});
