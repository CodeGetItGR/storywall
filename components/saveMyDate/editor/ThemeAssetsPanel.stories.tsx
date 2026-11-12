import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { ThemeAssetsPanel } from '@/components/saveMyDate/editor/ThemeAssetsPanel';

const meta = {
    title: 'SaveMyDate/Editor/ThemeAssetsPanel',
    component: ThemeAssetsPanel,
    decorators: [withEditorChrome],
} satisfies Meta<typeof ThemeAssetsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).InvitationEditor.noAssets)).toBeVisible();
    },
};
