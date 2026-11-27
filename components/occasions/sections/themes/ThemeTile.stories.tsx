import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withOccasionPage } from '@/.storybook/occasionPage';
import { ThemeTile } from '@/components/occasions/sections/themes/ThemeTile';

// The tile is a list item, so it sits in a list.
const meta = {
    title: 'Occasions/ThemeTile',
    component: ThemeTile,
    decorators: [
        withOccasionPage,
        (Story) => (
            <ul className="m-0 grid w-26 list-none p-0">
                <Story />
            </ul>
        ),
    ],
    args: {
        alt: 'Rainbow theme',
        theme: { id: 'theme-10', name: 'Ουράνιο Τόξο', backgroundColor: '#f6eefb', illustrationUrl: '/landing/decor-10.webp' },
    },
} satisfies Meta<typeof ThemeTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// A long name wraps under the picture.
export const LongName: Story = {
    args: {
        alt: 'Little Prince theme',
        theme: { id: 'theme-11', name: 'Μικρός Πρίγκιπας', backgroundColor: '#e7f5ef', illustrationUrl: '/landing/decor-11.webp' },
    },
};
