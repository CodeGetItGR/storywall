import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FOUND_STATE, PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { PublishedInvitationView } from '@/components/saveMyDate/published/PublishedInvitationView';
import el from '@/messages/el.json';

// next/font only works inside a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
function stubResizeObserver() {
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        disconnect() {}
    });
}

const labels = PUBLISHED_LABELS.en;

beforeEach(stubResizeObserver);

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('PublishedInvitationView', () => {
    it('draws the invitation in its own language', () => {
        const { container } = render(
            <NextIntlClientProvider locale="el" messages={el}>
                <PublishedInvitationView state={FOUND_STATE} labels={labels} />
            </NextIntlClientProvider>,
        );
        expect(container.querySelector('.smd-invitation')).toHaveAttribute('lang', 'el');
        expect(screen.queryByRole('heading', { name: labels.notFound })).toBeNull();
    });

    it('says an unknown link is not there, with nothing to retry', () => {
        render(<PublishedInvitationView state={{ kind: 'not-found' }} labels={labels} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("We couldn't find this invitation.");
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('says an expired invitation is no longer available', () => {
        render(<PublishedInvitationView state={{ kind: 'expired' }} labels={labels} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This invitation is no longer available.');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers to load the page again when the backend fails', () => {
        const reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
        render(<PublishedInvitationView state={{ kind: 'error' }} labels={labels} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("We couldn't load this invitation.");
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('shows the Greek copy', () => {
        render(<PublishedInvitationView state={{ kind: 'expired' }} labels={PUBLISHED_LABELS.el} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Αυτή η πρόσκληση δεν είναι πλέον διαθέσιμη.');
    });
});
