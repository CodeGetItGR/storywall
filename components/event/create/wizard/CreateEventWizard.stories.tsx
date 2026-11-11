import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyWizardAppConfig, storyWizardPlans } from '@/.storybook/fixtures';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

const PLANS_URL = '*/api/plan-tiers';

const nav = (query: Record<string, string>) => ({ nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', ...query } } } });

// Framed like the pop-up: the whole screen on phones, a 440px card on desktop (CreateEventDialog).
function WizardStory() {
    return (
        <div className="h-svh bg-white md:mx-auto md:mt-[5vh] md:h-[min(90vh,52rem)] md:w-110 md:overflow-hidden md:rounded-3xl md:shadow-xl">
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
    parameters: { layout: 'fullscreen', app: { user: null, appConfig: storyWizardAppConfig } },
    beforeEach({ msw }) {
        msw.use(
            http.get(PLANS_URL, ({ request }) => {
                const eventType = new URL(request.url).searchParams.get('eventType');
                return HttpResponse.json(storyWizardPlans.filter((plan) => !eventType || plan.eventTypeKey === eventType));
            }),
        );
    },
} satisfies Meta<typeof WizardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeStep: Story = { parameters: nav({ step: 'type' }) };

export const TypeStepBaptism: Story = { parameters: nav({ step: 'type', type: 'baptism' }) };

export const PlanStep: Story = { parameters: nav({ step: 'plan', type: 'wedding', plan: 'STORY' }) };

export const PlanStepLitePlan: Story = { parameters: nav({ step: 'plan', type: 'wedding', plan: 'QR' }) };

export const ComparePlans: Story = { parameters: nav({ step: 'plan', type: 'wedding', plan: 'STORY', sheet: 'plans' }) };
