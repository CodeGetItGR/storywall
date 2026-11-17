import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { STORY_BAPTISM_THEMES, STORY_WEDDING_THEMES } from '@/components/saveMyDate/storefront/storefrontStoryData';
import { ThemeCatalogue } from '@/components/saveMyDate/storefront/ThemeCatalogue';
import { DEFAULT_CATALOGUE_FILTERS, type InvitationThemeCardDto } from '@/lib/invitation/themeCatalogue';

// Both lists, by the event type each request asks for.
function catalogueHandler(weddings: InvitationThemeCardDto[], baptisms: InvitationThemeCardDto[]) {
    return http.get('*/api/invitation-themes', ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('eventType') === 'BAPTISM' ? baptisms : weddings),
    );
}

const meta = {
    title: 'SaveMyDate/Storefront/ThemeCatalogue',
    component: ThemeCatalogue,
    parameters: { layout: 'fullscreen', nextjs: { navigation: { pathname: '/invitations' } } },
    args: { path: '/invitations', initialFilters: DEFAULT_CATALOGUE_FILTERS },
    // The column choice and the scroll memory outlive a story; every story starts from neither.
    beforeEach({ msw }) {
        window.localStorage.removeItem('storywall:theme-catalogue-columns');
        window.sessionStorage.clear();
        msw.use(catalogueHandler(STORY_WEDDING_THEMES, STORY_BAPTISM_THEMES));
    },
} satisfies Meta<typeof ThemeCatalogue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Opened from a link that filters by event type and sorts by name.
export const FilteredBaptismAZ: Story = {
    args: { initialFilters: { eventType: 'BAPTISM', query: '', sort: 'az' } },
};

// Phones only: two cards a row.
export const TwoColumns: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const two = await canvas.findByRole('button', { name: copyFor(globals).SaveMyDateStorefront.catalogue.twoColumns });
        await userEvent.click(two);
        await expect(two).toHaveAttribute('aria-pressed', 'true');
    },
};

// A search that matches nothing.
export const NoMatches: Story = {
    args: { initialFilters: { ...DEFAULT_CATALOGUE_FILTERS, query: 'zzz' } },
};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(catalogueHandler([], []));
    },
};

// Loading: a response that never arrives.
export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/invitation-themes', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-themes', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};
