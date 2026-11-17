import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { EventNotFound } from '@/components/feed/EventNotFound';

const meta = {
    title: 'Feed/EventNotFound',
    component: EventNotFound,
    parameters: { layout: 'fullscreen' },
    decorators: [withAppContext],
} satisfies Meta<typeof EventNotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {};

export const SignedOut: Story = {
    parameters: { app: { user: null, event: null, member: null } },
};
