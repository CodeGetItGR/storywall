import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { landingHeroMainAction, occasionHeroMainAction } from '@/lib/landingHero';

afterEach(cleanup);

describe('LandingHeroActions', () => {
    it("marks the main button with the page's create link for the phone create button", () => {
        render(
            <LandingHeroActions
                createHref="/events/new?type=wedding"
                main={occasionHeroMainAction(false, '/events/new?type=wedding')}
                mainLabel="Plans"
            />,
        );
        const main = screen.getByRole('link', { name: 'Plans' });
        expect(main).toHaveAttribute('href', '#pricing');
        expect(main).toHaveAttribute('data-hero-create', '/events/new?type=wedding');
    });

    it('marks the main button with the plain create link on the landing', () => {
        render(
            <LandingHeroActions
                main={landingHeroMainAction(false)}
                mainLabel="Plans"
                secondary={{ href: '/demo', label: 'Demo', click: { event: 'demo', placement: 'hero' } }}
            />,
        );
        expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('data-hero-create', '/events/new');
        expect(screen.getByRole('link', { name: 'Demo' })).not.toHaveAttribute('data-hero-create');
    });

    it('sends the second button where it is told, with its own click', () => {
        render(
            <LandingHeroActions
                plain
                main={landingHeroMainAction(false)}
                mainLabel="Plans"
                secondary={{ href: '#themes', label: 'Themes', click: { event: 'nav', placement: 'hero', target: 'themes' } }}
            />,
        );
        const link = screen.getByRole('link', { name: 'Themes' });
        expect(link).toHaveAttribute('href', '#themes');
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero', target: 'themes' });
    });
});
