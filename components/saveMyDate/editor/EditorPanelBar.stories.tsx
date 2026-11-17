import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { EditorPanelBar } from '@/components/saveMyDate/editor/EditorPanelBar';

const meta = {
    title: 'SaveMyDate/Editor/EditorPanelBar',
    component: EditorPanelBar,
    decorators: [withEditorChrome],
    parameters: { layout: 'fullscreen' },
    args: { onOpen: fn() },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
} satisfies Meta<typeof EditorPanelBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.settings }));
        await expect(args.onOpen).toHaveBeenCalledWith('settings');
    },
};
