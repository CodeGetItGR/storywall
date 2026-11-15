import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';
import type { QrLandingPlan } from '@/lib/qrLanding';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const GUEST_PLAN: QrLandingPlan = { choices: ['join', 'upload', 'wish'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: 'wish' };

function renderChoices(plan: QrLandingPlan, isSignedIn = false, eventId: string | null = 'e1') {
    return render(<QrLandingChoices eventId={eventId} onChoose={vi.fn()} plan={plan} coverSrc={null} eventTitle="Maria & Nikos" isSignedIn={isSignedIn} />);
}

// KAN-213: joining is a card with a preview of the event; the other choices sit below it.
describe('QrLandingChoices', () => {
    afterEach(cleanup);

    it('shows a guest the join card, the account note and the no-account choices with their lines', () => {
        renderChoices(GUEST_PLAN);

        expect(screen.getByRole('img', { name: 'preview.feed' })).toBeInTheDocument();
        expect(screen.getByText('choices.joinLine')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'choices.join' })).toHaveAttribute('href', expect.stringContaining('inv'));
        expect(screen.getByText('choices.freeAccount')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'choices.noAccount' })).toBeInTheDocument();
        expect(screen.getByText('guestCode.uploadButton').parentElement).toHaveTextContent('choices.uploadLine');
        expect(screen.getByText('guestCode.wishButton').parentElement).toHaveTextContent('choices.wishLine');
    });

    it('leaves out the account note and the no-account label for someone signed in', () => {
        renderChoices(GUEST_PLAN, true);

        expect(screen.getByRole('link', { name: 'choices.join' })).toBeInTheDocument();
        expect(screen.queryByText('choices.freeAccount')).toBeNull();
        expect(screen.queryByText('choices.noAccount')).toBeNull();
    });

    it('shows a member the card with Open the event', () => {
        renderChoices({ choices: ['open', 'upload', 'wishbook'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null }, true);

        expect(screen.getByRole('link', { name: 'choices.open' })).toBeInTheDocument();
        expect(screen.getByText('choices.eventHint')).toBeInTheDocument();
        expect(screen.queryByText('choices.joinLine')).toBeNull();
        expect(screen.queryByText('choices.freeAccount')).toBeNull();
    });

    it('shows a lite guest code as plain rows, without a card or a label', () => {
        renderChoices({ choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self' }, false, null);

        expect(screen.queryByRole('img', { name: 'preview.feed' })).toBeNull();
        expect(screen.queryByText('choices.noAccount')).toBeNull();
        expect(screen.getByText('choices.uploadLine')).toBeInTheDocument();
    });
});
