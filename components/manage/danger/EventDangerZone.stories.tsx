import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { EventDangerZone } from '@/components/manage/danger/EventDangerZone';

const meta = {
    title: 'Manage/Danger/EventDangerZone',
    component: EventDangerZone,
    decorators: [
        (Story) => (
            <div className="max-w-[420px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        showGalleryDownload: true,
        wishbook: { href: '/events/evt-story/tools/wishbook', label: 'Wishbook' },
        onDownloadAllAction: fn(),
        onDeleteAction: fn(),
        isSendingCode: false,
        error: null,
    },
} satisfies Meta<typeof EventDangerZone>;

export default meta;
type Story = StoryObj<typeof meta>;

// The three lines, both downloads and the delete button.
export const Default: Story = {
    play: async ({ canvasElement, globals, args }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals);
        await expect(canvas.getByText(copy.ManagePage.settings.dangerZone.consequences.cannotUndo)).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: copy.ManagePage.settings.dangerZone.delete }));
        await expect(args.onDeleteAction).toHaveBeenCalled();
    },
};

// A plan without a gallery or wishbook: the lines only.
export const NoDownloads: Story = {
    args: { showGalleryDownload: false, wishbook: null },
};

// The code is on its way.
export const SendingCode: Story = {
    args: { isSendingCode: true },
};

// The code couldn't be sent.
export const SendError: Story = {
    args: { error: 'Too many requests. Please wait a moment and try again.' },
};
