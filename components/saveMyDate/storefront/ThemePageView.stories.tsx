import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { STORY_THEME_PAGE, storyThemeDto } from '@/components/saveMyDate/storefront/storefrontStoryData';
import { ThemePageView } from '@/components/saveMyDate/storefront/ThemePageView';

const meta = {
    title: 'SaveMyDate/Storefront/ThemePage',
    component: ThemePageView,
    parameters: { layout: 'fullscreen', nextjs: { navigation: { pathname: '/invitations/olive' } } },
    args: { slug: 'olive' },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-themes/:slug', () => HttpResponse.json(storyThemeDto(STORY_THEME_PAGE))));
    },
} satisfies Meta<typeof ThemePageView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The second photo, after the arrow.
export const NextPhoto: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).SaveMyDateStorefront.theme;
        await userEvent.click(await canvas.findByRole('button', { name: copy.nextPhoto }));
        await expect(canvas.getByRole('button', { name: copy.photo.replace('{number}', '2') })).toHaveAttribute('aria-current', 'true');
    },
};

// A theme without photos yet: its colour stands in.
export const NoPhotos: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-themes/:slug', () => HttpResponse.json(storyThemeDto({ ...STORY_THEME_PAGE, photos: [] }))));
    },
};

// Loading: a response that never arrives.
export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/invitation-themes/:slug', async () => {
                await delay('infinite');
                return HttpResponse.json({});
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-themes/:slug', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};
