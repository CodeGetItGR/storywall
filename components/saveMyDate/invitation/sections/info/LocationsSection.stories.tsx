import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, STORY_THEME, storySection } from '@/.storybook/invitation';

const section = storySection('locations');
const welcome = { welcomeEnabled: true, welcome: 'Καλωσόρισμα', welcomeAddress: 'Λιμάνι Ρόδου', welcomeMap: '' };

const icon = { image: { mediaId: 'm-icon' }, scale: 1, animation: 'none' as const };
const themeWithIcons = { ...STORY_THEME, art: { ...STORY_THEME.art, welcomeIcon: icon, receptionIcon: icon } };

const meta = {
    title: 'SaveMyDate/Info/LocationsSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoPlaces: Story = {};

export const ThreePlaces: Story = {
    args: { section: storySection('locations', welcome), theme: themeWithIcons },
};

export const WithNote: Story = {
    args: { section: storySection('locations', { note: 'Η δεξίωση ξεκινάει αμέσως μετά την τελετή.' }) },
};

export const WithoutIcons: Story = {
    args: { theme: { ...STORY_THEME, art: {} } },
};

export const LongContent: Story = {
    args: {
        section: storySection('locations', {
            ...welcome,
            ceremony: LONG_TITLE,
            ceremonyAddress: LONG_TEXT,
            welcome: LONG_TITLE,
            welcomeAddress: LONG_TEXT,
            note: LONG_TEXT,
            reception: LONG_TITLE,
            receptionAddress: LONG_TEXT,
        }),
    },
};

export const Empty: Story = {
    args: {
        section: storySection('locations', { ceremony: '', ceremonyAddress: '', ceremonyMap: '', reception: '', receptionAddress: '' }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('locations', welcome)) },
};
