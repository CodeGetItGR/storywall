import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent } from '@/.storybook/fixtures';
import { ScheduleStoryAvatar } from '@/components/feed/ScheduleStoryAvatar';

const meta = {
    title: 'Feed/ScheduleStoryAvatar',
    component: ScheduleStoryAvatar,
    decorators: [withAppContext],
} satisfies Meta<typeof ScheduleStoryAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wedding: Story = {};

export const Baptism: Story = {
    parameters: { app: { event: storyEvent({ eventType: 'BAPTISM' }) } },
};
