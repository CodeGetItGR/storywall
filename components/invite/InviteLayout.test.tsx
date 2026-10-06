import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteLayout } from '@/components/invite/InviteLayout';
import type { EventThemeDto, EventThemeFontDto } from '@/lib/api/types';

vi.mock('@/components/common/Logo', () => ({ Logo: () => null }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="hero" src={src} alt="" onError={onError} />,
}));

const THEME: EventThemeDto = {
    presetKey: 'swan',
    backgroundColor: '#FFCCEF',
    illustrationUrl: 'https://r2.test/swan.png',
    titleColor: null,
    headingFont: null,
};

const FONT: EventThemeFontDto = { key: 'swan-script', fallback: 'serif', url: '/api/theme-fonts/swan-script/2.woff2' };

function renderLayout(theme: EventThemeDto | null) {
    render(
        <InviteLayout coverImageSrc="/images/couple-hero.png" coverImageAlt="" theme={theme} eventTitle="Baptism">
            <p>body</p>
        </InviteLayout>,
    );
}

afterEach(cleanup);

describe('InviteLayout', () => {
    it('shows the cover when the event has no theme', () => {
        renderLayout(null);

        expect(screen.getByTestId('hero')).toHaveAttribute('src', '/images/couple-hero.png');
    });

    it("shows the theme's illustration on its colour in place of the cover", () => {
        renderLayout(THEME);

        const hero = screen.getByTestId('hero');
        expect(hero).toHaveAttribute('src', THEME.illustrationUrl);
        expect(hero.parentElement?.parentElement).toHaveStyle({ backgroundColor: '#FFCCEF' });
        expect(screen.getByRole('heading', { name: 'Baptism' })).toHaveClass('text-event-title', 'event-heading');
    });

    it('falls back to the cover when the illustration fails to load', () => {
        renderLayout(THEME);

        fireEvent.error(screen.getByTestId('hero'));

        expect(screen.getByTestId('hero')).toHaveAttribute('src', '/images/couple-hero.png');
    });

    it("wears the theme's heading font and title colour in illustration mode", () => {
        renderLayout({ ...THEME, titleColor: '#7A1F3D', headingFont: FONT });

        const column = screen.getByTestId('hero').parentElement?.parentElement as HTMLElement;
        expect(column).toHaveAttribute('data-theme-font');
        expect(column).toHaveStyle({ backgroundColor: '#FFCCEF' });
        expect(column.style.getPropertyValue('--event-title')).toBe('#7A1F3D');
        expect(column.style.getPropertyValue('--event-heading-font')).toBe('"theme-swan-script", serif');
        const styles = document.querySelectorAll('style');
        expect(styles).toHaveLength(1);
        expect(styles[0].textContent).toContain('@font-face');
        expect(column.contains(screen.getByRole('heading', { name: 'Baptism' }))).toBe(true);
    });

    it('declares no font when the theme has none', () => {
        renderLayout(THEME);

        const column = screen.getByTestId('hero').parentElement?.parentElement as HTMLElement;
        expect(document.querySelector('style')).toBeNull();
        expect(column).not.toHaveAttribute('data-theme-font');
        expect(column.style.getPropertyValue('--event-title')).toBe('');
    });

    it('declares no font over a cover photo', () => {
        renderLayout(null);

        expect(document.querySelector('style')).toBeNull();
        expect(document.querySelector('[data-theme-font]')).toBeNull();
    });

    it.each(['red', null])('declares no font on an unusable background (%s)', (backgroundColor) => {
        renderLayout({ ...THEME, backgroundColor: backgroundColor as string, titleColor: '#7A1F3D', headingFont: FONT });

        const column = screen.getByTestId('hero').parentElement?.parentElement as HTMLElement;
        expect(document.querySelector('style')).toBeNull();
        expect(column).not.toHaveAttribute('data-theme-font');
        expect(column.style.getPropertyValue('--event-title')).toBe('');
    });

    it('puts only the title colour and heading font tokens on the column, not the event-page tokens', () => {
        renderLayout({ ...THEME, titleColor: '#7A1F3D', headingFont: FONT });

        const column = screen.getByTestId('hero').parentElement?.parentElement as HTMLElement;
        for (const token of ['--event-bg', '--event-card-bg', '--event-card-line', '--surface-muted', '--orangish']) {
            expect(column.style.getPropertyValue(token), token).toBe('');
        }
    });
});
