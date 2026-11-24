import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { useStoryPanel } from '@/.storybook/sectionSettings';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EditorPanelSheet } from '@/components/saveMyDate/editor/EditorPanelSheet';
import { SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import { ThemeAssetsPanel } from '@/components/saveMyDate/editor/ThemeAssetsPanel';

type SheetArgs = { panel: 'assets' | 'settings' | 'controls'; onClose: () => void };

// A side panel opened as a sheet on a phone, with the editor's own content.
function PanelSheet({ panel, onClose }: SheetArgs) {
    const t = useTranslations('InvitationEditor');
    return (
        <EditorPanelSheet open title={panel === 'assets' ? t('themeAssets') : t('settings')} onClose={onClose}>
            {panel === 'assets' && <ThemeAssetsPanel />}
            {panel === 'settings' && <TextColorSetting value="#4f4a3f" themeColors={[]} onChange={fn()} />}
            {panel === 'controls' && <SectionControls />}
        </EditorPanelSheet>
    );
}

// A section's fields, buttons and hints, as the admin theme editor puts them in a sheet.
function SectionControls() {
    const { scope, groups } = useStoryPanel('s-program', true);
    return <SectionSettingsPanel scope={scope} groups={groups} />;
}

const meta = {
    title: 'SaveMyDate/Editor/EditorPanelSheet',
    component: PanelSheet,
    args: { panel: 'settings', onClose: fn() },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof PanelSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {};

// The text colour's mixer, light as the sheet.
export const TextColorMixer: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(await waitForOpen('dialog')).getByRole('button', { name: copy.moreColors }));
        await within(document.body).findByRole('button', { name: copy.sectionSettings.done }, { timeout: 10_000 });
    },
};

export const ThemeAssets: Story = {
    args: { panel: 'assets' },
};

// The editor's shared controls in the light sheet.
export const Controls: Story = {
    args: { panel: 'controls' },
};
