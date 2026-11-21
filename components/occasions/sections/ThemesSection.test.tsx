import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemesSection } from '@/components/occasions/sections/ThemesSection';
import { findOccasion } from '@/lib/occasions/occasions';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

const THEMES = [{ backgroundColor: '#e6f6f2', id: 'unicorn', illustrationUrl: '/landing/decor-10.webp', name: 'Μονόκερος' }];

afterEach(cleanup);

describe('ThemesSection (baptism)', () => {
    it("names each tile in the baptism's words and links to create", async () => {
        render(await ThemesSection({ createHref: '/events/new?type=baptism', locale: 'el', media: BAPTISM_PAGE_MEDIA, occasion: findOccasion('BAPTISM')!, themes: THEMES }));
        expect(screen.getByRole('img', { name: 'Θέμα βάπτισης Μονόκερος' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Φτιάξε το StoryWall σου/ })).toHaveAttribute('href', '/events/new?type=baptism');
        expect(screen.getByText('Έτσι δείχνει μια βάπτιση με θέμα Μονόκερος.')).toBeInTheDocument();
    });
});
