import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrWeddingGuide } from '@/components/qrWedding/QrWeddingGuide';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => {
        const t = (key: string) => key;
        t.raw = (key: string) => (key === 'where.places' ? ['At the entrance', 'On every table'] : ['"Scan to share!"', '"Share it with us."']);
        return t;
    },
}));

describe('QrWeddingGuide', () => {
    afterEach(() => {
        cleanup();
    });

    it('asks each question as an h2', async () => {
        render(await QrWeddingGuide({ locale: 'en' }));

        expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
            'what.title',
            'where.title',
            'sign.title',
        ]);
    });

    it('lists the places and the sign texts', async () => {
        render(await QrWeddingGuide({ locale: 'en' }));

        expect(screen.getByText('On every table')).toBeInTheDocument();
        expect(screen.getByText('"Share it with us."')).toBeInTheDocument();
        expect(screen.getByText('sign.tip')).toBeInTheDocument();
    });

    it('can be linked to from the header', async () => {
        const { container } = render(await QrWeddingGuide({ locale: 'en' }));

        expect(container.querySelector('section#guide')).not.toBeNull();
    });
});
