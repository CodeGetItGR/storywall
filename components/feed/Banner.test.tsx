import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Banner } from '@/components/feed/Banner';

vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ src }: { src: string }) => <span data-testid="banner-image" data-src={src} />,
}));

afterEach(cleanup);

describe('Banner', () => {
    it('shows the theme illustration instead of the cover photo', () => {
        render(
            <Banner image="https://media.example/cover.jpg" illustrationUrl="https://media.example/dino.webp" title="Baptism" glowVisible={false} />,
        );
        const images = screen.getAllByTestId('banner-image');
        expect(images).toHaveLength(1);
        expect(images[0].dataset.src).toBe('https://media.example/dino.webp');
    });

    it('hides the add-cover prompt on a themed event', () => {
        render(
            <Banner
                image={null}
                illustrationUrl="https://media.example/dino.webp"
                title="Baptism"
                glowVisible={false}
                fallbackActionHref="/events/e-1/manage?tab=settings"
                fallbackActionLabel="Add cover photo"
            />,
        );
        expect(screen.queryByRole('link', { name: 'Add cover photo' })).toBeNull();
    });

    it('keeps the cover and the prompt without a theme', () => {
        const { rerender } = render(<Banner image="https://media.example/cover.jpg" title="Baptism" glowVisible={false} />);
        expect(screen.getByTestId('banner-image').dataset.src).toBe('https://media.example/cover.jpg');

        rerender(
            <Banner
                image={null}
                illustrationUrl={null}
                title="Baptism"
                glowVisible={false}
                fallbackActionHref="/events/e-1/manage?tab=settings"
                fallbackActionLabel="Add cover photo"
            />,
        );
        expect(screen.getByRole('link', { name: 'Add cover photo' })).toBeInTheDocument();
    });
});
