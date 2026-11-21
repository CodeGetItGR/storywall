import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';
import { invitationPublicUrl } from '@/lib/invitation/publication';
import type { QrEventDetails, QrLandingPlan } from '@/lib/qrLanding';
import { SITE_URL } from '@/lib/seo';

const trackFlow = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/flowTracking', () => ({ trackFlow }));

const GUEST_PLAN: QrLandingPlan = { choices: ['join', 'upload', 'wish'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: 'wish', invitationSlug: null };

function renderChoices(plan: QrLandingPlan, isSignedIn = false, eventId: string | null = 'e1', details: QrEventDetails | null = null) {
    return render(
        <QrLandingChoices eventId={eventId} onChoose={vi.fn()} plan={plan} coverSrc={null} eventTitle="Maria & Nikos" isSignedIn={isSignedIn} details={details} />,
    );
}

// KAN-213: joining is a card with a preview of the event; the other choices sit above it.
describe('QrLandingChoices', () => {
    afterEach(cleanup);

    it('shows a guest the join card, the account note and the no-account choices with their lines', () => {
        renderChoices(GUEST_PLAN);

        expect(screen.getByRole('img', { name: 'preview.feed' })).toBeInTheDocument();
        expect(screen.getByText('choices.joinLine')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'choices.join' })).toBeNull();
        expect(screen.getByText('choices.freeAccount')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'choices.noAccount' })).toBeInTheDocument();
        expect(screen.getByText('guestCode.uploadButton').parentElement).toHaveTextContent('choices.uploadLine');
        expect(screen.getByText('guestCode.wishButton').parentElement).toHaveTextContent('choices.wishLine');
    });

    // The no-account choices come first, so they are on the first screen of any phone.
    it('puts the other choices above the join card', () => {
        renderChoices(GUEST_PLAN);

        const upload = screen.getByText('guestCode.uploadButton');
        const card = screen.getByRole('link', { name: 'createAccount' });
        expect(upload.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    // The invite page between the card and the forms is skipped: both carry the invite and lead to the feed.
    it('sends a guest straight to sign-up and log-in with the event invite', () => {
        renderChoices(GUEST_PLAN);

        const register = screen.getByRole('link', { name: 'createAccount' }).getAttribute('href') ?? '';
        const login = screen.getByRole('link', { name: 'haveAccount' }).getAttribute('href') ?? '';
        expect(register).toMatch(/^\/register\?/);
        expect(login).toMatch(/^\/login\?/);
        for (const href of [register, login]) {
            const query = new URLSearchParams(href.split('?')[1]);
            expect(query.get('invite')).toBe('inv');
            expect(query.get('next')).toContain('e1');
        }
    });

    it('counts the sign-up and log-in taps like the invite page', () => {
        renderChoices(GUEST_PLAN);

        fireEvent.click(screen.getByRole('link', { name: 'createAccount' }));
        fireEvent.click(screen.getByRole('link', { name: 'haveAccount' }));
        expect(trackFlow).toHaveBeenNthCalledWith(1, { name: 'Invite Choice', choice: 'register' });
        expect(trackFlow).toHaveBeenNthCalledWith(2, { name: 'Invite Choice', choice: 'login' });
    });

    it('shows when and where above the card', () => {
        renderChoices(GUEST_PLAN, false, 'e1', { when: 'Sat, Nov 28, 2026, 6:30 PM', where: 'Kifisia' });

        expect(screen.getByText('Sat, Nov 28, 2026, 6:30 PM')).toBeInTheDocument();
        expect(screen.getByText('Kifisia')).toBeInTheDocument();
    });

    it('leaves out the account note and the no-account label for someone signed in', () => {
        renderChoices(GUEST_PLAN, true);

        expect(screen.getByRole('link', { name: 'choices.join' })).toHaveAttribute('href', expect.stringContaining('inv'));
        expect(screen.queryByRole('link', { name: 'createAccount' })).toBeNull();
        expect(screen.queryByText('choices.freeAccount')).toBeNull();
        expect(screen.queryByText('choices.noAccount')).toBeNull();
    });

    it('shows a member the card with Open the event', () => {
        renderChoices({ choices: ['open', 'upload', 'wishbook'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null, invitationSlug: null }, true);

        expect(screen.getByRole('link', { name: 'choices.open' })).toBeInTheDocument();
        expect(screen.getByText('choices.eventHint')).toBeInTheDocument();
        expect(screen.queryByText('choices.joinLine')).toBeNull();
        expect(screen.queryByText('choices.freeAccount')).toBeNull();
    });

    it('shows a lite guest code as plain rows, without a card or a label', () => {
        renderChoices({ choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self', invitationSlug: null }, false, null);

        expect(screen.queryByRole('img', { name: 'preview.feed' })).toBeNull();
        expect(screen.queryByText('choices.noAccount')).toBeNull();
        expect(screen.getByText('choices.uploadLine')).toBeInTheDocument();
    });

    // KAN-225: the live invitation opens on the invite host.
    it('links See the invitation to the published invitation', () => {
        renderChoices({ choices: ['join', 'invitation'], joinInviteToken: 'inv', uploadToken: null, wishToken: null, invitationSlug: 'maria-nikos' });

        expect(screen.getByRole('link', { name: /choices\.invitation/ })).toHaveAttribute('href', invitationPublicUrl(SITE_URL, 'maria-nikos'));
        expect(screen.getByRole('img', { name: 'choices.invitation' })).toBeInTheDocument();
    });
});
