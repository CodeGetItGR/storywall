import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { onDarkPage, onMiddlePage, onPage } from '@/.storybook/pageTone';
import { InvitationFooter } from '@/components/feed/InvitationFooter';

// On picture themes: Feed/Layout/FeedThemedPage.
const meta = {
    title: 'Feed/InvitationFooter',
    component: InvitationFooter,
} satisfies Meta<typeof InvitationFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnLightPage: Story = { decorators: [onPage('#dfe9e4')] };
export const OnDarkPage: Story = { decorators: [onDarkPage] };
export const OnMiddlePage: Story = { decorators: [onMiddlePage] };
