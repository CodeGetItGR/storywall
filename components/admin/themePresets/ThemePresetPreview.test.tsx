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
        render(<ThemePresetPreview backgroundColor="#BFE6E2" illustrationUrl="blob:preview" title="Dino" />);
        expect(screen.getByTestId('theme-preview-surface').style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
        expect(screen.getByTestId('banner-image').dataset.src).toBe('blob:preview');
        expect(screen.getByRole('heading', { name: 'Dino' })).toBeInTheDocument();
    });

    it('falls back to the default background while the colour is invalid', () => {
        render(<ThemePresetPreview backgroundColor={null} illustrationUrl={null} title="Dino" />);
        expect(screen.getByTestId('theme-preview-surface').style.getPropertyValue('--event-bg')).toBe('');
        expect(screen.queryByTestId('banner-image')).toBeNull();
    });
});
