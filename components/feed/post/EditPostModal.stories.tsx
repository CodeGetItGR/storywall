import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyPost } from '@/.storybook/fixtures';
import { EditPostModal } from '@/components/feed/post/EditPostModal';

async function editAndSave({ globals }: { globals: Record<string, unknown> }) {
    const body = within(document.body);
    const t = copyFor(globals).PostCard;
    await userEvent.type(await body.findByRole('textbox', { name: t.editPostAriaLabel }), ' Bring sunglasses.');
    await userEvent.click(body.getByRole('button', { name: t.save }));
}

const meta = {
    title: 'Feed/Post/EditPostModal',
    component: EditPostModal,
    args: { post: storyPost(), open: true, onCloseAction: fn() },
    parameters: { layout: 'fullscreen' },
    decorators: [withAppContext],
} satisfies Meta<typeof EditPostModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Saving: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.patch('*/api/posts/:postId', async () => {
                await delay('infinite');
                return HttpResponse.json(storyPost());
            }),
        );
    },
    play: editAndSave,
};

export const SaveFailed: Story = {
    beforeEach({ msw }) {
        msw.use(http.patch('*/api/posts/:postId', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
    play: editAndSave,
};
