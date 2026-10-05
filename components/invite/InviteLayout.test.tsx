import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteLayout } from '@/components/invite/InviteLayout';

vi.mock('@/components/common/Logo', () => ({ Logo: () => null }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="hero" src={src} alt="" onError={onError} />,
}));

const THEME = { presetKey: 'swan', backgroundColor: '#FFCCEF', illustrationUrl: 'https://r2.test/swan.png' };

function renderLayout(theme: typeof THEME | null) {
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
        expect(screen.getByRole('heading', { name: 'Baptism' })).toHaveClass('text-ink');
    });

    it('falls back to the cover when the illustration fails to load', () => {
        renderLayout(THEME);

        fireEvent.error(screen.getByTestId('hero'));

        expect(screen.getByTestId('hero')).toHaveAttribute('src', '/images/couple-hero.png');
    });
});
