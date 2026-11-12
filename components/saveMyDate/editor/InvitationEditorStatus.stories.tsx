import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorScreen } from '@/.storybook/editor';
import { InvitationEditorError, InvitationEditorLoading } from '@/components/saveMyDate/editor/InvitationEditorStatus';

const meta = {
    title: 'SaveMyDate/Editor/InvitationEditorStatus',
    component: InvitationEditorError,
    decorators: [withEditorScreen],
    parameters: { layout: 'fullscreen' },
    args: { onRetry: fn() },
} satisfies Meta<typeof InvitationEditorError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoadFailed: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.retry }));
        await expect(args.onRetry).toHaveBeenCalledOnce();
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    render: () => <InvitationEditorLoading />,
    tags: ['visual-skip'],
};

// The admin's theme editor could not load the theme.
export const ThemeLoadFailed: Story = {
    args: { subject: 'theme' },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).InvitationEditor.themeLoadFailed)).toBeVisible();
    },
};
