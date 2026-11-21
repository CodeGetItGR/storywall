import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemesView, type ThemesViewProps } from '@/components/occasions/sections/themes/ThemesView';

const THEMES = ['Rainbow', 'Unicorn'].map((name, index) => ({
    alt: `Baptism theme ${name}`,
    theme: { backgroundColor: '#f6eefb', id: `t${index}`, illustrationUrl: `/landing/decor-1${index}.webp`, name },
}));

function props(overrides: Partial<ThemesViewProps> = {}): ThemesViewProps {
    return {
        cta: { href: '/events/new?type=baptism', label: 'Create your StoryWall' },
        heading: ['Pick the theme', 'for the baptism.'],
        kicker: 'BAPTISM THEMES',
        lead: 'Unicorn, Little Prince and more.',
        phone: { alt: 'A baptism on the Unicorn theme', caption: 'This is a baptism on the Unicorn theme.', photo: { src: '/landing/baptism/baptism-feed-unicorn.webp', width: 978, height: 1764 } },
        tiles: THEMES,
        ...overrides,
    };
}

afterEach(cleanup);

describe('ThemesView', () => {
    it('is the page themes anchor, under one heading', () => {
        const { container } = render(<ThemesView {...props()} />);
        const section = container.querySelector('section')!;
        expect(section).toHaveAttribute('id', 'themes');
        expect(section).toHaveAttribute('data-landing-section', 'themes');
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Pick the themefor the baptism.');
    });

    it('shows each theme with its picture and name', () => {
        render(<ThemesView {...props()} />);
        const tiles = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(tiles.map((tile) => tile.textContent)).toEqual(['Rainbow', 'Unicorn']);
        expect(screen.getByRole('img', { name: 'Baptism theme Unicorn' })).toBeInTheDocument();
    });

    it('leaves out the grid without themes and keeps the rest', () => {
        render(<ThemesView {...props({ tiles: [] })} />);
        expect(screen.queryByRole('list')).toBeNull();
        expect(screen.getByRole('link', { name: /Create your StoryWall/ })).toHaveAttribute('href', '/events/new?type=baptism');
        expect(screen.getByRole('img', { name: 'A baptism on the Unicorn theme' })).toBeInTheDocument();
    });

    it('counts the button as a create click from the themes', () => {
        render(<ThemesView {...props()} />);
        const link = screen.getByRole('link', { name: /Create your StoryWall/ });
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'create', placement: 'themes' });
        expect(link).toHaveClass('hover:-translate-y-0.75', 'motion-reduce:transition-none');
    });

    it('shows the phone with its caption', () => {
        render(<ThemesView {...props()} />);
        expect(screen.getByText('This is a baptism on the Unicorn theme.').tagName).toBe('FIGCAPTION');
    });
});
