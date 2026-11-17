import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { PreviewWidthSwitch } from '@/components/saveMyDate/editor/preview/PreviewWidthSwitch';

const meta = {
    title: 'SaveMyDate/Editor/Preview/PreviewWidthSwitch',
    component: PreviewWidthSwitch,
    decorators: [withEditorChrome],
    args: { value: 'mobile', onChange: fn() },
} satisfies Meta<typeof PreviewWidthSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: copy.previewMobile })).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(canvas.getByRole('button', { name: copy.previewDesktop }));
        await expect(args.onChange).toHaveBeenCalledWith('desktop');
    },
};

export const Desktop: Story = { args: { value: 'desktop' } };
