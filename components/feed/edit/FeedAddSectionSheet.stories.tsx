import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';

const ctx = {
    ...buildRenderContext(defaultFeedLayout(), { ...wallThemeDesign(null), textAnimation: 'none' }, () => undefined),
    labels: INVITATION_LABELS.en,
};
const types = ['coupleNames', 'dressCode', 'faq'] as const;

const meta = {
    title: 'Feed/Edit/FeedAddSectionSheet',
    component: FeedAddSectionSheet,
    args: {
        open: true,
        previews: { items: types.map((type) => ({ type, section: feedSectionPreview(type, null, 'WEDDING') })), ctx, lang: 'en', fontFaces: '' },
        onAdd: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof FeedAddSectionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {};
export const NothingToAdd: Story = { args: { previews: { items: [], ctx, lang: 'en', fontFaces: '' } } };
