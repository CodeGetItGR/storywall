import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyWizardAppConfig } from '@/.storybook/fixtures';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

const PLANS_URL = '*/api/plan-tiers';

function WizardStory() {
    return (
        <div className="h-[44rem]">
            <CreateEventFormProvider mode="wizard">
                <CreateEventWizard leading={<span className="size-11" aria-hidden="true" />} />
            </CreateEventFormProvider>
        </div>
    );
}

const meta = {
    title: 'Event/CreateEventWizard',
    component: WizardStory,
    decorators: [withAppContext],
    parameters: { app: { user: null, appConfig: storyWizardAppConfig } },
    beforeEach({ msw }) {
        msw.use(http.get(PLANS_URL, () => HttpResponse.json([])));
    },
} satisfies Meta<typeof WizardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type' } } } },
};

export const PlanStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'plan', type: 'wedding' } } } },
};
