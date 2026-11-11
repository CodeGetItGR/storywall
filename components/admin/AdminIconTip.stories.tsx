import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FaInstagram } from 'react-icons/fa6';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { AdminIconTip } from '@/components/admin/AdminIconTip';

const meta = {
    title: 'Admin/IconTip',
    component: AdminIconTip,
    args: { label: 'Instagram', children: <FaInstagram aria-hidden="true" className="h-5 w-5" /> },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof AdminIconTip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AtRest: Story = {};

// Reached by keyboard: the word shows under the icon.
export const Focused: Story = {
    async play({ canvasElement }) {
        await userEvent.tab();
        await expect(await within(canvasElement.ownerDocument.body).findByText('Instagram')).toBeInTheDocument();
    },
};
