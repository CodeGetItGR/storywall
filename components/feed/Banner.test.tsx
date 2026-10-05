import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Banner } from '@/components/feed/Banner';

vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-testid="banner-image" data-src={src} alt={alt} onError={onError} />
    ),
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

    describe('illustration mode', () => {
        const illustration = 'https://media.example/dino.webp';

        it('paints the theme colour behind an alt-less illustration', () => {
            render(<Banner image={null} illustrationUrl={illustration} title="Baptism" glowVisible={false} />);
            const image = screen.getByTestId('banner-image');
            expect(image).toHaveAttribute('alt', '');
            expect(image.parentElement).toHaveClass('bg-event');
        });

        it('shows the title below the artwork in dark ink, with no white overlay title or dark gradient', () => {
            const { container } = render(<Banner image={null} illustrationUrl={illustration} title="Baptism" glowVisible />);
            const heading = screen.getByRole('heading', { level: 1, name: 'Baptism' });
            expect(heading).toHaveClass('text-ink');
            expect(heading).not.toHaveClass('text-white');
            expect(container.querySelector('[class*="rgba(20,17,16"]')).toBeNull();
            const art = screen.getByTestId('banner-image').parentElement as HTMLElement;
            expect(art.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(art.contains(heading)).toBe(false);
        });

        it('keeps the actions reachable over the artwork', () => {
            render(<Banner image={null} illustrationUrl={illustration} title="Baptism" glowVisible={false} actions={<button>Share</button>} />);
            expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
        });

        it('reports an illustration that fails to load', () => {
            const onIllustrationError = vi.fn();
            render(
                <Banner image={null} illustrationUrl={illustration} title="Baptism" glowVisible={false} onIllustrationError={onIllustrationError} />,
            );
            fireEvent.error(screen.getByTestId('banner-image'));
            expect(onIllustrationError).toHaveBeenCalledTimes(1);
        });
    });

    it('keeps the white overlay title over a cover photo', () => {
        render(<Banner image="https://media.example/cover.jpg" title="Baptism" glowVisible={false} />);
        expect(screen.getByRole('heading', { level: 1, name: 'Baptism' })).toHaveClass('text-white');
    });
});
