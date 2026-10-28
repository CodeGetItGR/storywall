import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingPrivate } from '@/components/occasions/wedding/WeddingPrivate';
import { WEDDING_PRIVATE_ICONS } from '@/lib/occasions/weddingFeatures';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingPrivate', () => {
    it('shows four numbered cards, each with its icon', async () => {
        const { container } = render(await WeddingPrivate({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ένα ιδιωτικό Social γεμάτο στιγμές και συναισθήματα.');
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ιδιωτικός τοίχος',
            'Διαχείριση από εσένα',
            'Ρόλοι καλεσμένων',
            'Λήψη σε αρχική ποιότητα',
        ]);
        const cards = screen.getAllByRole('listitem');
        expect(cards.map((card) => card.firstElementChild?.textContent)).toEqual(['01', '02', '03', '04']);
        const icons = [...container.querySelectorAll<HTMLElement>('[class*="mask-image"]')];
        expect(icons.map((icon) => icon.style.getPropertyValue('--icon'))).toEqual(WEDDING_PRIVATE_ICONS.map((src) => `url('${src}')`));
    });
});
