import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteEventCard } from '@/components/invite/InviteEventCard';
import type { EventInvitationPreviewDto } from '@/lib/api/types';

const preview = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useEventInvitations', () => ({ useEventInvitationPreview: () => preview }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="thumb" src={src} alt="" onError={onError} />,
}));

function invite(overrides: Partial<EventInvitationPreviewDto> = {}): EventInvitationPreviewDto {
    return {
        inviteToken: 'tok',
        eventId: 'e1',
        eventTitle: 'Anna & Nikos',
        eventSubtitle: null,
        eventDescription: null,
        eventStartAt: '2027-06-12T18:00:00+03:00',
        eventEndAt: null,
        eventTimezone: 'Europe/Athens',
        eventLocationName: null,
        coverMediaId: null,
        coverMedia: null,
        theme: null,
        firstName: null,
        lastName: null,
        email: null,
        expired: false,
        alreadyUsed: false,
        gift: null,
        ...overrides,
    };
}

beforeEach(() => {
    preview.data = undefined;
});
afterEach(cleanup);

describe('InviteEventCard', () => {
    it('names the event the invite leads to', () => {
        preview.data = invite();
        render(<InviteEventCard inviteToken="tok" />);

        expect(screen.getByText('Anna & Nikos')).toBeInTheDocument();
        expect(screen.queryByTestId('thumb')).not.toBeInTheDocument();
    });

    it('shows nothing before the preview arrives, or for an invite that cannot be used', () => {
        const { container, rerender } = render(<InviteEventCard inviteToken="tok" />);
        expect(container).toBeEmptyDOMElement();

        preview.data = invite({ expired: true });
        rerender(<InviteEventCard inviteToken="tok" />);
        expect(container).toBeEmptyDOMElement();

        preview.data = invite({ alreadyUsed: true });
        rerender(<InviteEventCard inviteToken="tok" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("prefers the theme's illustration and falls back to the cover when it fails", () => {
        preview.data = invite({
            coverMedia: { mediaUrl: 'https://r2.test/cover.jpg' } as EventInvitationPreviewDto['coverMedia'],
            theme: {
                presetKey: 'swan',
                backgroundColor: '#FFCCEF',
                illustrationUrl: 'https://r2.test/swan.png',
                titleColor: null,
                headingFont: null,
            },
        });
        render(<InviteEventCard inviteToken="tok" />);

        expect(screen.getByTestId('thumb')).toHaveAttribute('src', 'https://r2.test/swan.png');
        fireEvent.error(screen.getByTestId('thumb'));
        expect(screen.getByTestId('thumb')).toHaveAttribute('src', 'https://r2.test/cover.jpg');
    });
});
