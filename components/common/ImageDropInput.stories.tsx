import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ImageDropInput } from '@/components/common/ImageDropInput';

const PHOTO_NAME = 'wedding-cake-with-a-very-long-file-name.png';

const meta = {
    title: 'Common/ImageDropInput',
    component: ImageDropInput,
    args: { name: 'photo', accept: 'image/*' },
    decorators: [
        (Story) => (
            <div className="max-w-sm">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ImageDropInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Disabled: Story = {
    args: { disabled: true },
};

export const WithPhoto: Story = {
    async play({ canvasElement }) {
        const blob = await fetch('/images/post-cake.png').then((response) => response.blob());
        const photo = new File([blob], PHOTO_NAME, { type: 'image/png' });
        const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
        await userEvent.upload(input, photo);
        await within(canvasElement).findByText(PHOTO_NAME);
        await waitFor(() => expect(canvasElement.querySelector('img')?.complete).toBe(true));
    },
};
