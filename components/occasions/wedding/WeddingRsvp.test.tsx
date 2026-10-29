import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingRsvp } from '@/components/occasions/wedding/WeddingRsvp';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingRsvp', () => {
    it('heads the section with both lines', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            'Μην αναρωτιέσαι ποιος θα έρθει. Θα ξέρεις. Χωρίς τηλέφωνα και μηνύματα.',
        );
    });

    it('puts the kicker above the heading', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 }).previousElementSibling).toHaveTextContent('RSVP γάμου');
    });

    it('shows both halves in one wide picture, and each half on its own for phones', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        const wide = screen.getByRole('img', { name: /^Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα/ });
        expect(wide).toHaveClass('hidden', 'min-[761px]:block');
        expect(wide.getAttribute('src')).toContain('wedding-rsvp-replies-without-and-with.webp');
        expect(screen.getByRole('img', { name: /^Χωρίς StoryWall: οι απαντήσεις/ }).parentElement).toHaveClass('min-[761px]:hidden');
        expect(screen.getByRole('img', { name: /^Με StoryWall: φόρμα RSVP/ }).getAttribute('src')).toContain('wedding-rsvp-replies-with.webp');
    });

    it('shows the English pictures on the English page', async () => {
        render(await WeddingRsvp({ locale: 'en' }));
        expect(screen.getByRole('img', { name: /^Without StoryWall, RSVPs arrive/ }).getAttribute('src')).toContain(
            'wedding-rsvp-replies-without-and-with-en.webp',
        );
        expect(screen.getByRole('img', { name: /^With StoryWall: RSVP form/ }).getAttribute('src')).toContain('wedding-rsvp-replies-with-en.webp');
    });

    it('lists the four points beside the picture', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByText('ΟΛΕΣ ΟΙ ΑΠΑΝΤΗΣΕΙΣ')).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Όλες οι απαντήσεις σε ένα μέρος',
            'Ποιοι έρχονται',
            'Συνοδοί & παιδιά',
            'Απλή και γρήγορη διαδικασία',
        ]);
    });
});
