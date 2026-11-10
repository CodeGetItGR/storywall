import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { ReloadButton } from '@/components/saveMyDate/published/ReloadButton';

const meta = {
    title: 'SaveMyDate/Published/ReloadButton',
    component: ReloadButton,
    args: { label: PUBLISHED_LABELS.en.retry },
} satisfies Meta<typeof ReloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};

export const Greek: Story = { args: { label: PUBLISHED_LABELS.el.retry } };
