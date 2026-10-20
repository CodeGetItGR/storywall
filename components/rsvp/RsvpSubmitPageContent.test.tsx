import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpSubmitPageContent, type RsvpSubmitPageData } from '@/components/rsvp/RsvpSubmitPageContent';

vi.mock('@/components/rsvp/RsvpSubmitFormContent', () => ({ RsvpSubmitFormContent: () => <div>form</div> }));
vi.mock('@/components/rsvp/RsvpSubmittedContent', () => ({ RsvpSubmittedContent: () => <div>submitted</div> }));
vi.mock('@/components/rsvp/RsvpUnavailableState', () => ({ RsvpUnavailableState: () => <div>unavailable</div> }));
vi.mock('@/components/rsvp/RsvpHeader', () => ({ RsvpHeader: () => <div>header</div> }));
vi.mock('next-intl', () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));

afterEach(cleanup);

function data(overrides: Record<string, unknown> = {}) {
    return {
        rsvpAvailability: { isUnavailable: false },
        eventId: 'e1',
        backHref: '/events/e1/feed',
        submitted: false,
        hasExistingRsvp: false,
        sessionAnswersError: null,
        isVendor: false,
        ...overrides,
    } as unknown as RsvpSubmitPageData;
}

describe('RsvpSubmitPageContent', () => {
    it('shows the form for a guest', () => {
        render(<RsvpSubmitPageContent data={data()} />);
        expect(screen.getByText('form')).toBeTruthy();
    });

    it('shows one line instead of the form for a vendor', () => {
        render(<RsvpSubmitPageContent data={data({ isVendor: true })} />);
        expect(screen.getByText('ApiErrors.vendorCannotRsvp')).toBeTruthy();
        expect(screen.queryByText('form')).toBeNull();
    });
});
