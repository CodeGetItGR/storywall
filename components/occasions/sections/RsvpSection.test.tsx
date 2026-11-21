import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpSection } from '@/components/occasions/sections/RsvpSection';
import type { Locale } from '@/i18n/config';
import { findOccasion } from '@/lib/occasions/occasions';
import { WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

const rsvp = (locale: Locale) => RsvpSection({ locale, media: WEDDING_PAGE_MEDIA, occasion: findOccasion('WEDDING')! });

afterEach(cleanup);

describe('RsvpSection (wedding)', () => {
    it('heads the section with both lines', async () => {
        render(await rsvp('el'));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            'Μην αναρωτιέσαι ποιος θα έρθει. Θα ξέρεις. Χωρίς τηλέφωνα και μηνύματα.',
        );
    });

    it('puts the kicker above the heading', async () => {
        render(await rsvp('el'));
        expect(screen.getByRole('heading', { level: 2 }).previousElementSibling).toHaveTextContent('RSVP γάμου');
    });

    it('shows both halves in one wide picture, and each half on its own for phones', async () => {
        render(await rsvp('el'));
        const wide = screen.getByRole('img', { name: /^Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα/ });
        expect(wide).toHaveClass('hidden', 'min-[761px]:block');
        expect(wide.getAttribute('src')).toMatch(/^\/landing\/wedding\/wedding-rsvp-replies-without-and-with\.webp/);
        expect(screen.getByRole('img', { name: /^Χωρίς StoryWall: οι απαντήσεις/ }).parentElement).toHaveClass('min-[761px]:hidden');
        expect(screen.getByRole('img', { name: /^Με StoryWall: φόρμα RSVP/ }).getAttribute('src')).toContain('wedding-rsvp-replies-with.webp');
    });

    it('shows the English pictures on the English page', async () => {
        render(await rsvp('en'));
        expect(screen.getByRole('img', { name: /^Without StoryWall, RSVPs arrive/ }).getAttribute('src')).toContain(
            'wedding-rsvp-replies-without-and-with-en.webp',
        );
        expect(screen.getByRole('img', { name: /^With StoryWall: RSVP form/ }).getAttribute('src')).toContain('wedding-rsvp-replies-with-en.webp');
    });

    it('lists the four points beside the picture', async () => {
        render(await rsvp('el'));
        expect(screen.getByText('ΟΛΕΣ ΟΙ ΑΠΑΝΤΗΣΕΙΣ')).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Όλες οι απαντήσεις σε ένα μέρος',
            'Ποιοι έρχονται',
            'Συνοδοί & παιδιά',
            'Απλή και γρήγορη διαδικασία',
        ]);
    });
});
