import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InviteLayout } from '@/components/invite/InviteLayout';

// A tall body standing in for a long form, so the space below it shows.
function TallBody() {
    return (
        <div className="flex flex-col gap-4">
            <div className="h-[28rem] rounded-2xl border border-dashed border-border" />
            <button type="button" className="w-full rounded-full py-3 text-sm font-semibold text-white bg-gradient-brand">
                Upload
            </button>
        </div>
    );
}

const meta = {
    title: 'Invite/InviteLayout',
    component: InviteLayout,
    parameters: { layout: 'fullscreen' },
    args: {
        coverImageAlt: 'Event cover',
        eventTitle: 'Anna & Nikos',
        eventSubtitle: '12 June 2027',
        scroll: 'page',
        heroTone: 'plain',
        children: <TallBody />,
    },
    decorators: [
        (Story) => (
            <div className="h-svh">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof InviteLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// No cover and no theme art: the logo stands in, and there's no footer, so the body keeps its own bottom space.
export const LogoHeroLongForm: Story = {};
