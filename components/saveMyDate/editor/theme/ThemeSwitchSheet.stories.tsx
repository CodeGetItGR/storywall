import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { ThemeSwitchSheet } from '@/components/saveMyDate/editor/theme/ThemeSwitchSheet';

const meta = {
    title: 'SaveMyDate/Editor/ThemeSwitchSheet',
    component: ThemeSwitchSheet,
    args: {
        step: { kind: 'picking' },
        list: {
            kind: 'themes',
            themes: [
                { slug: 'olive', name: 'Olive', eventType: 'WEDDING', cardColor: '#8a9a5b', cardThumbUrl: null },
                { slug: 'linen', name: 'Linen', eventType: 'WEDDING', cardColor: '#efe6d8', cardThumbUrl: null },
                { slug: 'sea', name: 'Sea', eventType: 'WEDDING', cardColor: '#9fc3d1', cardThumbUrl: null },
            ],
        },
        currentSlug: 'olive',
        onChoose: fn(),
        onRetryList: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof ThemeSwitchSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Designs: Story = {
    play: async ({ args }) => {
        const sheet = await waitForOpen('dialog');
        await userEvent.click(within(sheet).getByRole('button', { name: /Linen/ }));
        await expect(args.onChoose).toHaveBeenCalledWith('linen');
    },
};

export const Mobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async () => {
        await waitForOpen('dialog');
    },
};

// The spinner turns, so the visual check skips it.
export const LoadingDesign: Story = {
    args: { step: { kind: 'loading', slug: 'linen' } },
    tags: ['visual-skip'],
    play: async () => {
        await waitForOpen('dialog');
    },
};

export const DesignFailed: Story = {
    args: { step: { kind: 'failed', slug: 'linen' } },
    play: async () => {
        const sheet = await waitForOpen('dialog');
        await expect(within(sheet).getByRole('alert')).toBeVisible();
    },
};

export const LoadingList: Story = {
    args: { list: { kind: 'loading' } },
    tags: ['visual-skip'],
    play: async () => {
        await waitForOpen('dialog');
    },
};

export const ListFailed: Story = {
    args: { list: { kind: 'error' } },
    play: async ({ args, globals }) => {
        const sheet = await waitForOpen('dialog');
        await userEvent.click(within(sheet).getByRole('button', { name: copyFor(globals).InvitationEditor.retry }));
        await expect(args.onRetryList).toHaveBeenCalledOnce();
    },
};
