import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyWizardAppConfig } from '@/.storybook/fixtures';
import CreateEventDialog from '@/components/event/create/wizard/CreateEventDialog';

const meta = {
    title: 'Event/CreateEventDialog',
    component: CreateEventDialog,
    decorators: [withAppContext],
    args: { onClose: fn() },
    parameters: {
        app: { user: null, appConfig: storyWizardAppConfig },
        nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type' } } },
    },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/plan-tiers', () => HttpResponse.json([])));
    },
} satisfies Meta<typeof CreateEventDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
