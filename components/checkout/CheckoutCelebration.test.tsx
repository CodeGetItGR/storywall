import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckoutCelebration } from '@/components/checkout/CheckoutCelebration';

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

describe('CheckoutCelebration', () => {
    it('shows the event card, the heading and both buttons', () => {
        render(<CheckoutCelebration card={CARD} feedHref="/events/e1/feed" inviteHref="/events/e1/manage/qr" />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CheckoutSuccessPage.celebration.heading');
        expect(screen.getByText('CheckoutSuccessPage.celebration.line')).toBeInTheDocument();
        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'EventCelebration.openEvent' })).toHaveAttribute('href', '/events/e1/feed');
        expect(screen.getByRole('link', { name: 'EventCelebration.inviteGuests' })).toHaveAttribute('href', '/events/e1/manage/qr');
    });

    it('shows the heading and buttons before the event has loaded', () => {
        render(<CheckoutCelebration card={null} feedHref="/f" inviteHref="/q" />);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
