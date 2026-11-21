import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { ThemesView } from '@/components/occasions/sections/themes/ThemesView';
import { themesViewProps } from '@/components/occasions/sections/themes/themesViewProps';
import type { LandingTheme } from '@/lib/landingThemes';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const meta = { title: 'Occasions/ThemesView', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// In production the themes come from the backend; these are fixture data.
const theme = (id: number, name: string, backgroundColor: string): LandingTheme => ({
    id: `theme-${id}`,
    name,
    backgroundColor,
    illustrationUrl: `/landing/decor-${id}.webp`,
});

const THEMES: LandingTheme[] = [
    theme(10, 'Ουράνιο Τόξο', '#f6eefb'),
    theme(11, 'Μικρός Πρίγκιπας', '#e7f5ef'),
    theme(12, 'Μικρή Νεράιδα', '#fdeaea'),
    theme(13, 'Χάρτινο Καραβάκι', '#c6e8fb'),
    theme(14, 'Μονόκερος', '#e6f6f2'),
    theme(15, 'Αεροπλανάκι', '#e7f7fd'),
];

export const SixThemes: Story = {
    render: (_, { globals }) => (
        <ThemesView
            {...themesViewProps({
                copy: translatorFor(globals, 'OccasionPages.BAPTISM.themes'),
                createHref: '/register',
                phone: BAPTISM_PAGE_MEDIA.themesPhone,
                themes: THEMES,
            })}
        />
    ),
};

// The backend gave no themes.
export const NoThemes: Story = {
    render: (_, { globals }) => (
        <ThemesView
            {...themesViewProps({
                copy: translatorFor(globals, 'OccasionPages.BAPTISM.themes'),
                createHref: '/register',
                phone: BAPTISM_PAGE_MEDIA.themesPhone,
                themes: [],
            })}
        />
    ),
};
