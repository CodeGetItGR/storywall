import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeaturesSection } from '@/components/occasions/sections/FeaturesSection';
import { findOccasion } from '@/lib/occasions/occasions';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('FeaturesSection (wedding)', () => {
    it('shows the offered features in the design order, with shared copy where the wedding has none', async () => {
        render(await FeaturesSection({ featureKeys: ['gallery', 'invitation', 'he_or_she', 'unknown'], locale: 'el', occasion: findOccasion('WEDDING')! }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ηλεκτρονικό προσκλητήριο',
            'Φωτογραφίες καλεσμένων',
            'Αγόρι ή κορίτσι;',
        ]);
    });

    it('is the page features anchor, under one heading', async () => {
        const { container } = render(await FeaturesSection({ featureKeys: ['invitation'], locale: 'el', occasion: findOccasion('WEDDING')! }));
        expect(container.querySelector('section')).toHaveAttribute('id', 'features');
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Η δική σου ιστοσελίδα γάμου, με όλα όσα χρειάζεσαι.');
    });

    it('never lists themes as a feature', async () => {
        render(await FeaturesSection({ featureKeys: ['invitation', 'theme'], locale: 'el', occasion: findOccasion('WEDDING')! }));
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    });
});

describe('FeaturesSection (baptism)', () => {
    it("uses the baptism's own words, the shared line elsewhere, and never a themes card", async () => {
        render(await FeaturesSection({ featureKeys: ['invitation', 'theme', 'quiz_polls'], locale: 'el', occasion: findOccasion('BAPTISM')! }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Ηλεκτρονικό προσκλητήριο', 'Κουίζ & Ψηφοφορίες']);
        expect(screen.getByText(/με το θέμα που διάλεξες/)).toBeInTheDocument();
    });
});
