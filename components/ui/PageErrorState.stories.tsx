import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CalendarX } from 'lucide-react';
import { fn } from 'storybook/test';

import { PageErrorState } from '@/components/ui/PageErrorState';
import { ApiError } from '@/lib/api/client';

const meta = {
    title: 'UI/PageErrorState',
    component: PageErrorState,
    parameters: { layout: 'fullscreen' },
    args: {
        title: 'Something went wrong',
        description: 'We couldn’t load this page. Try again in a moment.',
    },
} satisfies Meta<typeof PageErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRetry: Story = {
    args: { onRetryAction: fn() },
};

export const WithBackLink: Story = {
    args: {
        title: 'Event not found',
        description: 'This event may have been removed.',
        icon: <CalendarX className="h-7 w-7" />,
        actionHref: '/home',
        actionLabel: 'Back to home',
    },
};

// A 500 shows its reference in small print, for support.
export const ServerErrorWithReference: Story = {
    args: {
        onRetryAction: fn(),
        actionHref: '/home',
        actionLabel: 'Back to home',
        error: new ApiError(500, {
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            detail: 'Unexpected error',
            instance: '/api/events',
            errorCode: 5000,
            errorRef: '3f9a1c0b7d2e',
        }),
    },
};
