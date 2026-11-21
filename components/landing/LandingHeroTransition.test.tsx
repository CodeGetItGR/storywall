import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { routes } from '@/lib/routes';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('LandingHeroTransition', () => {
    it('goes to the demo by default, named and counted as the demo', async () => {
        render(await LandingHeroTransition({}));
        expect(screen.getByRole('region', { name: 'Demo του StoryWall' })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /ΔΕΣ ΤΟ DEMO/ });
        expect(link).toHaveAttribute('href', routes.demo);
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'demo', placement: 'hero_band' });
    });

    it("takes an occasion's own link, label, button and click", async () => {
        render(
            await LandingHeroTransition({
                click: { event: 'nav', placement: 'hero_band', target: 'themes' },
                cta: 'THEMES',
                href: '#themes',
                label: 'Themes band',
            }),
        );
        expect(screen.getByRole('region', { name: 'Themes band' })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /THEMES/ });
        expect(link).toHaveAttribute('href', '#themes');
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero_band', target: 'themes' });
    });
});
