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

// Save my date themes after "No theme"; names come from the server.
const INVITATION_THEMES: ThemeRadioOption[] = [
    { id: 'invitation:rose', label: 'Rose garden', backgroundColor: '#FBE6E4', titleColor: '#9C4A5A', titleFontFamily: 'Georgia, serif' },
    { id: 'invitation:olive', label: 'Olive branch', backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', titleFontFamily: '"Courier New", monospace' },
].map((theme) => ({ ...theme, presetId: theme.id, illustrationUrl: null, headingFont: null, selected: false }));

// The Theme sheet of an event without the theme module: "No theme" in the event's current wall look,
// then the Save my date themes. `onWall`: the feed is on the wall look, so "No theme" is the current card.
function ThemeSheet({ look, onWall, isDesktop }: { look: EventThemeDto | null; onWall: boolean; isDesktop: boolean }) {
    const none = useNoThemeCard(look, onWall);
    const options = [none, ...INVITATION_THEMES.map((theme, index) => ({ ...theme, selected: !onWall && index === 0 }))];
    return (
        <FeedThemeSheet
            open
            isDesktop={isDesktop}
            options={options}
            fontFaces=""
            hasInvitationThemes={false}
            disabled={false}
            previewTitle="Anna & Nikos"
            background={undefined}
            onSelect={fn()}
            onBackground={fn()}
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

// An event with no wall theme at all: "No theme" is the plain look.
export const NoThemePlain: Story = { args: { look: null } };

// The phone sheet.
export const NoThemeSelectedMobile: Story = { args: { isDesktop: false }, globals: { viewport: { value: 'mobile' } } };
