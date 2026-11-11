import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyUser, storyWizardAppConfig, storyWizardPlans } from '@/.storybook/fixtures';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import type { EventTypeConvention } from '@/lib/api/types';
import { clearCreateEventWizardDraft, writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';
import { rememberCodeSentAt } from '@/lib/emailCode';
import { EMPTY_GIFT_DETAILS } from '@/lib/gift';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

const PLANS_URL = '*/api/plan-tiers';

const nav = (query: Record<string, string>) => ({ nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', ...query } } } });

// Saved answers up to the step a story opens on, cleared again after the story.
const ANSWERS = {
    run: 'story',
    durationPicks: {},
    title: 'Maria & Nikos',
    startAt: '2026-09-12T18:00',
    timezone: 'Europe/Athens',
    locationName: 'Agios Nikolaos',
    locationAddress: 'Kifisias 123, Athens',
    mapsUrl: '',
    themePresetId: null,
    gift: { isGift: false, details: EMPTY_GIFT_DETAILS },
    checkoutCode: '',
};

const seed = (step: 'details' | 'theme' | 'overview' | 'account', eventType: EventTypeConvention, planCode: string) => () => {
    writeCreateEventWizardDraft({ ...ANSWERS, step, eventType, planCode });
    return clearCreateEventWizardDraft;
};

const THEME_PRESETS = [
    {
        id: 'swan',
        key: 'swan',
        name: { en: 'Swan', el: 'Κύκνος' },
        backgroundColor: '#FFF0F1',
        illustrationUrl: '/landing/03-wedding-ceremony-santorini.webp',
        titleColor: null,
        headingFont: null,
    },
    {
        id: 'stars',
        key: 'stars',
        name: { en: 'Stars', el: 'Αστέρια' },
        backgroundColor: '#EEF3FF',
        illustrationUrl: '/landing/03-wedding-ceremony-santorini.webp',
        titleColor: null,
        headingFont: null,
    },
];

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
            http.get('*/api/theme-presets', () => HttpResponse.json(THEME_PRESETS)),
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

export const DetailsStep: Story = {
    parameters: nav({ step: 'details', type: 'wedding', plan: 'STORY' }),
    beforeEach: seed('details', 'WEDDING', 'STORY'),
};

export const DetailsStepEmpty: Story = { parameters: nav({ step: 'details', type: 'wedding', plan: 'STORY' }) };

// The shared fixture's baptism plan has no theme; this story's does.
const BAPTISM_WITH_THEME = storyWizardPlans
    .filter((plan) => plan.eventTypeKey === 'BAPTISM')
    .map((plan) => ({ ...plan, moduleKeys: [...plan.moduleKeys, 'theme'] }));

export const ThemeStep: Story = {
    // Theme presets load for signed-in hosts only.
    parameters: { ...nav({ step: 'theme', type: 'baptism', plan: 'BAPTISM' }), app: { user: storyUser, appConfig: storyWizardAppConfig } },
    beforeEach({ msw }) {
        msw.use(http.get(PLANS_URL, () => HttpResponse.json(BAPTISM_WITH_THEME)));
        return seed('theme', 'BAPTISM', 'BAPTISM')();
    },
};

export const ReviewStep: Story = {
    parameters: nav({ step: 'overview', type: 'wedding', plan: 'STORY' }),
    beforeEach: seed('overview', 'WEDDING', 'STORY'),
};

export const AccountStep: Story = {
    parameters: nav({ step: 'account' }),
    beforeEach: seed('account', 'WEDDING', 'STORY'),
};

export const AccountSignUp: Story = {
    parameters: nav({ step: 'account', account: 'signup' }),
    beforeEach: seed('account', 'WEDDING', 'STORY'),
};

// Signed in with an unverified email: the code screen, with the resend countdown running.
const codeStory = (extra: Parameters<typeof http.post>[]): Story['beforeEach'] =>
    function codeBeforeEach({ msw }) {
        msw.use(
            http.post('*/api/auth/email-code', () => new HttpResponse(null, { status: 204 })),
            ...extra.map(([path, resolver]) => http.post(path, resolver)),
        );
        rememberCodeSentAt(storyUser.userId, Date.now());
        return seed('account', 'WEDDING', 'STORY')();
    };

const CODE_PARAMETERS = {
    ...nav({ step: 'account', account: 'code' }),
    app: { user: { ...storyUser, emailVerified: false }, appConfig: storyWizardAppConfig },
};

// The countdown text changes between runs, so the visual check skips it.
export const AccountCode: Story = {
    tags: ['visual-skip'],
    parameters: CODE_PARAMETERS,
    beforeEach: codeStory([]),
};

export const AccountCodeWrong: Story = {
    tags: ['visual-skip'],
    parameters: CODE_PARAMETERS,
    beforeEach: codeStory([['*/api/auth/email-code/verify', () => HttpResponse.json({ errorCode: 3127, status: 400 }, { status: 400 })]]),
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).CreateEventPage.wizard.code;
        await userEvent.type(await within(canvasElement).findByLabelText(copy.label), '123456');
    },
};
