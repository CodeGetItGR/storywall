import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventCelebration } from '@/components/celebration/EventCelebration';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const CARD = { photoSrc: '/landing/03-wedding-ceremony-santorini.webp', alt: 'Wedding', title: 'Maria & Nikos', date: 'Sat, 12 June 2027' };

afterEach(cleanup);

describe('EventCelebration', () => {
    it('shows the card, the given heading and line, and both buttons', () => {
        render(<EventCelebration card={CARD} heading="Gift claimed" line="The event is yours now." feedHref="/events/e1/feed" inviteHref="/events/e1/manage/qr" />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gift claimed');
        expect(screen.getByText('The event is yours now.')).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'EventCelebration.openEvent' })).toHaveAttribute('href', '/events/e1/feed');
        expect(screen.getByRole('link', { name: 'EventCelebration.inviteGuests' })).toHaveAttribute('href', '/events/e1/manage/qr');
    });

    it('fills the whole screen on a page without the app header', () => {
        const { container } = render(<EventCelebration card={null} heading="h" line="l" feedHref="/f" inviteHref="/q" belowHeader={false} />);
        expect(container.firstChild).toHaveClass('min-h-svh');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
