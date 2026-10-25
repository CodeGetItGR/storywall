import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingRsvp } from '@/components/occasions/wedding/WeddingRsvp';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingRsvp', () => {
    it('heads the section with both lines', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Μην αναρωτιέσαι ποιος θα έρθει. Όλες οι απαντήσεις σε ένα μέρος.');
    });

    it('draws the comparison as one picture with a localized name', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        const picture = screen.getByRole('img', { name: /^Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα/ });
        for (const name of ['Κατερίνα', 'Πέτρος', 'Μαρία', 'Θεοδώρα', 'Γιώργος']) expect(within(picture).getByText(name)).toBeInTheDocument();
        expect(within(picture).getByText('Νάντια Ευθυμίου')).toBeInTheDocument();
        expect(within(picture).getByText('Υποβολή RSVP')).toBeInTheDocument();
        expect(within(picture).getByText('265 ημέρες απομένουν · 15 Ιουλίου 2027')).toBeInTheDocument();
    });

    it('marks a no in red and a yes in green', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(within(screen.getByText('Πέτρος').closest('li')!).getByText('Όχι')).toHaveClass('text-[#d93a32]');
        expect(within(screen.getByText('Κατερίνα').closest('li')!).getByText('Ναι, 2 άτομα')).toHaveClass('text-[#2a6834]');
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
