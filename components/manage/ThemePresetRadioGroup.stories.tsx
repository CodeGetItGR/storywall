import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { expect, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';

// Preset names come from the server in each locale; these stand in for them.
const PRESETS: ThemeRadioOption[] = [
    { id: 'olive', label: 'Olive garden', backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', icon: '/icons/church.svg' },
    { id: 'blush', label: 'Blush', backgroundColor: '#FBE6E4', titleColor: '#9C4A5A', icon: '/icons/balloon.svg' },
    { id: 'sea', label: 'Sea breeze', backgroundColor: '#E2EFF4', titleColor: '#2C5B74', icon: '/icons/cocktail.svg' },
    { id: 'gold', label: 'Golden hour', backgroundColor: '#FBEFD6', titleColor: '#8A5A12', icon: '/icons/present.svg' },
    { id: 'night', label: 'Night party', backgroundColor: '#2C2740', titleColor: '#2C2740', icon: '/icons/music.svg' },
    { id: 'lilac', label: 'Lilac', backgroundColor: '#EFE7F6', titleColor: '#5F3F80', icon: '/icons/camera.svg' },
    { id: 'paper', label: 'Paper', backgroundColor: '#F6F1EA', titleColor: null, icon: '/icons/story.svg' },
].map(({ icon, ...preset }) => ({ ...preset, presetId: preset.id, illustrationUrl: icon, headingFont: null, selected: preset.id === 'olive' }));

// Save my date themes as the Theme page lists them after the presets; names come from the server.
const INVITATION_THEMES: ThemeRadioOption[] = [
    { id: 'invitation:rose', label: 'Rose garden', backgroundColor: '#FBE6E4', titleColor: '#9C4A5A', titleFontFamily: 'Georgia, serif' },
    { id: 'invitation:olive', label: 'Olive branch', backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', titleFontFamily: '"Courier New", monospace' },
].map((theme) => ({ ...theme, presetId: theme.id, illustrationUrl: null, headingFont: null, selected: false }));

// The Theme page's grid, with "No theme" first and its label from the app's copy.
function ThemeGrid({
    previewTitle,
    savingPresetId,
    extra,
    locked,
}: {
    previewTitle?: string;
    savingPresetId?: string | null;
    // Save my date cards after the presets; `locked` puts the lock on them.
    extra?: ThemeRadioOption[];
    locked?: boolean;
}) {
    const t = useTranslations('ManagePage.settings.theme');
    const extras = (extra ?? []).map((option) => (locked ? { ...option, locked: true, lockedLabel: t('locked') } : option));
    const tModules = useTranslations('Modules');
    const none: ThemeRadioOption = {
        id: 'none',
        presetId: null,
        label: t('none'),
        backgroundColor: null,
        illustrationUrl: null,
        titleColor: null,
        headingFont: null,
        selected: false,
    };

    return (
        <div className="p-4">
            {/* Heading */}
            <h2 id="theme-heading" className="sr-only">
                {tModules('theme.name')}
            </h2>

            {/* Themes */}
            <ThemePresetRadioGroup
                options={[none, ...PRESETS, ...extras]}
                labelledBy="theme-heading"
                disabled={savingPresetId !== undefined}
                savingPresetId={savingPresetId}
                previewTitle={previewTitle}
                onSelectAction={fn()}
            />
        </div>
    );
}

const meta = {
    title: 'Manage/Theme/ThemeGrid',
    component: ThemeGrid,
    args: { previewTitle: 'Maria & Nikos' },
} satisfies Meta<typeof ThemeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every card previews the event title in the theme's colour, with the theme name under it.
export const WithTitle: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: 'Olive garden' })).toHaveAttribute('aria-checked', 'true');
        await expect(canvas.getByRole('radio', { name: copyFor(globals).ManagePage.settings.theme.none })).toBeVisible();
        await expect(canvas.getAllByText('Maria & Nikos').length).toBeGreaterThan(PRESETS.length);
    },
};

// A Greek title, to check accents fit the title row.
export const GreekTitle: Story = { args: { previewTitle: 'Μαρία & Νίκος' } };

// A title too long for the card is cut with an ellipsis.
export const LongTitle: Story = { args: { previewTitle: 'The wedding of Alexandra Papadopoulou and Konstantinos' } };

// Without a title the cards show just the theme name.
export const WithoutTitle: Story = { args: { previewTitle: undefined } };

// A pick is being saved: a spinner on that card, the rest dimmed.
export const Saving: Story = { tags: ['visual-skip'], args: { savingPresetId: 'sea' } };

// Save my date themes after the presets, each title in its theme's font and colour.
export const WithInvitationThemes: Story = {
    args: { extra: INVITATION_THEMES },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('radio', { name: 'Rose garden' })).toBeInTheDocument();
    },
};

// Without Save my date the themes show with a lock.
export const LockedInvitationThemes: Story = {
    args: { extra: INVITATION_THEMES, locked: true },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('radio', { name: 'Rose garden' })).toHaveAccessibleDescription(
            copyFor(globals).ManagePage.settings.theme.locked,
        );
    },
};
