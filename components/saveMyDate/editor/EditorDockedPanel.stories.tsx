import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { fn } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';

// The settings panel as the editor docks it. Narrower screens hide it and use the sheet.
function SettingsPanel() {
    const t = useTranslations('InvitationEditor');
    return (
        <EditorDockedPanel title={t('settings')}>
            <TextColorSetting value="#4f4a3f" onChange={fn()} />
        </EditorDockedPanel>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/EditorDockedPanel',
    component: SettingsPanel,
    decorators: [withEditorChrome],
    tags: ['visual-desktop-only'],
    globals: { viewport: { value: 'desktop' } },
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {};
