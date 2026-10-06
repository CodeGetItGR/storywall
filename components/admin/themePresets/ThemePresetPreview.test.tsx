import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemePresetPreview } from '@/components/admin/themePresets/ThemePresetPreview';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ src }: { src: string }) => <span data-testid="banner-image" data-src={src} />,
}));

afterEach(cleanup);

describe('ThemePresetPreview', () => {
    it('paints the event home in the draft colour with the illustration as the hero', () => {
        render(<ThemePresetPreview backgroundColor="#BFE6E2" illustrationUrl="blob:preview" title="Dino" titleColor={null} headingFont={null} />);
        expect(screen.getByTestId('theme-preview-surface').style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
        expect(screen.getByTestId('banner-image').dataset.src).toBe('blob:preview');
        expect(screen.getByRole('heading', { name: 'Dino' })).toBeInTheDocument();
    });

    it('falls back to the default background while the colour is invalid', () => {
        render(<ThemePresetPreview backgroundColor={null} illustrationUrl={null} title="Dino" titleColor={null} headingFont={null} />);
        expect(screen.getByTestId('theme-preview-surface').style.getPropertyValue('--event-bg')).toBe('');
        expect(screen.queryByTestId('banner-image')).toBeNull();
    });

    const FONT = { key: 'alegreya', fallback: 'serif' as const, url: '/api/theme-fonts/alegreya/1.woff2' };

    it('draws the title in the theme colour and heading font, with or without an illustration', () => {
        for (const illustrationUrl of ['blob:preview', null]) {
            const { container, unmount } = render(
                <ThemePresetPreview
                    backgroundColor="#FFFFFF"
                    illustrationUrl={illustrationUrl}
                    title="Dino"
                    titleColor="#7A1F3D"
                    headingFont={FONT}
                />,
            );
            const surface = screen.getByTestId('theme-preview-surface');
            expect(surface.style.getPropertyValue('--event-title')).toBe('#7A1F3D');
            expect(surface.style.getPropertyValue('--event-heading-font')).toBe('"theme-alegreya", serif');
            expect(surface).toHaveAttribute('data-theme-font', '');
            expect(container.querySelector('style')?.textContent).toContain('/api/theme-fonts/alegreya/1.woff2');
            const heading = screen.getByRole('heading', { name: 'Dino' });
            expect(heading).toHaveClass('event-heading', 'text-event-title');
            unmount();
        }
    });

    it('leaves the font scope off without a heading font', () => {
        const { container } = render(
            <ThemePresetPreview backgroundColor="#FFFFFF" illustrationUrl={null} title="Dino" titleColor={null} headingFont={null} />,
        );
        expect(screen.getByTestId('theme-preview-surface')).not.toHaveAttribute('data-theme-font');
        expect(container.querySelector('style')).toBeNull();
    });

    it('paints the sample posts like the real post cards', () => {
        render(<ThemePresetPreview backgroundColor="#FFFFFF" illustrationUrl={null} title="Dino" titleColor={null} headingFont={null} />);
        const posts = screen.getAllByTestId('theme-preview-post');
        expect(posts).toHaveLength(2);
        for (const post of posts) expect(post).toHaveClass('bg-event-card', 'border-event-card-line');
    });
});
