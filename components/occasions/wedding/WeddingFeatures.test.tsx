import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingFeatures } from '@/components/occasions/wedding/WeddingFeatures';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingFeatures', () => {
    it('shows the offered features in the design order, with shared copy where the wedding has none', async () => {
        render(await WeddingFeatures({ featureKeys: ['gallery', 'invitation', 'he_or_she', 'unknown'], locale: 'el' }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ηλεκτρονικό προσκλητήριο',
            'Φωτογραφίες καλεσμένων',
            'Αγόρι ή κορίτσι;',
        ]);
    });

    it('is the page features anchor, under one heading', async () => {
        const { container } = render(await WeddingFeatures({ featureKeys: ['invitation'], locale: 'el' }));
        expect(container.querySelector('section')).toHaveAttribute('id', 'features');
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Η δική σου ιστοσελίδα γάμου, με όλα όσα χρειάζεσαι.');
    });
});
