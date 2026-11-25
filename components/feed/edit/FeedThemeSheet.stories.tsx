import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useNoThemeCard } from '@/hooks/useWallThemeOptions';
import type { EventThemeDto } from '@/lib/api/types';

// The event's own wall look, a preset picked before the event lost the theme module.
const OLIVE: EventThemeDto = {
    presetKey: 'olive',
    backgroundColor: '#EEF1E4',
    illustrationUrl: '/icons/church.svg',
    titleColor: '#4D5A2C',
    headingFont: null,
};

// Save my date themes after "No theme", each portrait picture on the same light neutral; names come from the server.
const INVITATION_THEMES: ThemeRadioOption[] = [
    { id: 'invitation:rose', label: 'Rose garden', titleColor: '#9C4A5A', titleFontFamily: 'Georgia, serif', art: '/landing/qr-wedding/table-card-pampas-en.webp' },
    { id: 'invitation:olive', label: 'Olive branch', titleColor: '#4D5A2C', titleFontFamily: '"Courier New", monospace', art: '/landing/qr-wedding/table-card-olive-branch-en.webp' },
].map(({ art, ...theme }) => ({
    ...theme,
    presetId: theme.id,
    // The catalogue's card colour (every staging theme has this mint); the card leaves it out for one light neutral.
    backgroundColor: '#B8DFD3',
    illustrationUrl: art,
    neutralSwatch: true,
    headingFont: null,
    selected: false,
}));

type ThemeSheetProps = { look: EventThemeDto | null; onWall: boolean; isDesktop: boolean; solidColor?: string };

// The Theme sheet of an event without the theme module: "No theme" in the event's current wall look,
// then the Save my date themes. `onWall`: the feed is on the wall look, so "No theme" is the current card.
function ThemeSheet({ look, onWall, isDesktop, solidColor }: ThemeSheetProps) {
    const none = useNoThemeCard(look, onWall);
    const options = [{ ...none, selected: none.selected && solidColor === undefined }, ...INVITATION_THEMES.map((theme, index) => ({ ...theme, selected: !onWall && index === 0 }))];
    return (
        <FeedThemeSheet
            open
            isDesktop={isDesktop}
            options={options}
            fontFaces=""
            hasInvitationThemes={false}
            disabled={false}
            solidDisabled={false}
            previewTitle="Anna & Nikos"
            solidColor={solidColor ?? (onWall && look === null ? '#FFFFFF' : undefined)}
            onSelect={fn()}
            onSolidColor={fn()}
            onClose={fn()}
        />
    );
}

const meta = {
    title: 'Feed/Edit/FeedThemeSheet',
    component: ThemeSheet,
    parameters: { layout: 'fullscreen' },
    args: { look: OLIVE, onWall: true, isDesktop: true },
} satisfies Meta<typeof ThemeSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// On the wall: "No theme" is selected, drawn in the event's own wall look.
export const NoThemeSelected: Story = {};

// On a Save my date theme: "No theme" takes the feed back to the event's own wall look.
export const NoThemeUnselected: Story = { args: { onWall: false } };

// An event with no wall theme at all: "No theme" is the plain look, so white is picked with it.
export const NoThemePlain: Story = { args: { look: null } };

// The feed in one colour: no card is the current one.
export const SolidColor: Story = { args: { solidColor: '#AC9FC7' } };
// A mixed colour too dark for the text.
export const SolidColorMobile: Story = { args: { solidColor: '#7A3B2E', isDesktop: false }, globals: { viewport: { value: 'mobile' } } };

// A mixed colour on the desktop panel: white, the four, the mixed one and "+" on one row.
export const SolidColorMixed: Story = { args: { solidColor: '#7A3B2E' } };

// White and "No theme" picked, on a phone.
export const NoThemePlainMobile: Story = { args: { look: null, isDesktop: false }, globals: { viewport: { value: 'mobile' } } };

// The phone sheet.
export const NoThemeSelectedMobile: Story = { args: { isDesktop: false }, globals: { viewport: { value: 'mobile' } } };
