import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { mobileOnly } from '@/.storybook/modes';
import { ComposerFab } from '@/components/layout/mobile-tab-bar/ComposerFab';

const meta = {
    title: 'Layout/MobileTabBar/ComposerFab',
    component: ComposerFab,
    args: { hidden: false },
    globals: { viewport: { value: 'mobile' } },
    parameters: { layout: 'fullscreen', ...mobileOnly },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ComposerFab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MenuOpen: Story = {
    async play({ canvasElement, globals }) {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).MobileTabBar.compose }));
    },
};

// A member who can only post sees one choice.
export const PostsOnly: Story = {
    parameters: { app: { composer: { canComposeStory: false, canComposeSong: false } } },
    play: MenuOpen.play,
};

// Slides away while a sheet or menu is open.
export const Hidden: Story = {
    args: { hidden: true },
};
