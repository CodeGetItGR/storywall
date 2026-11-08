import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { EditorNotice } from '@/components/saveMyDate/editor/EditorNotice';

type NoticeArgs = { tone: 'error' | 'info'; onAction: () => void };

// The messages come from the app's copy, as in InvitationEditor.
function Notice({ tone, onAction }: NoticeArgs) {
    const t = useTranslations('InvitationEditor');
    return tone === 'error' ? (
        <EditorNotice tone="error" message={t('notSaved')} actionLabel={t('retry')} onAction={onAction} />
    ) : (
        <EditorNotice tone="info" message={t('publishUnavailable')} />
    );
}

const meta = {
    title: 'SaveMyDate/Editor/EditorNotice',
    component: Notice,
    decorators: [withEditorChrome],
    parameters: { layout: 'fullscreen' },
    args: { tone: 'error', onAction: fn() },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotSaved: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.retry }));
        await expect(args.onAction).toHaveBeenCalledOnce();
    },
};

export const PublishUnavailable: Story = {
    args: { tone: 'info' },
};
