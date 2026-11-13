import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { useStoryPanel } from '@/.storybook/sectionSettings';
import { FollowEventSettings } from '@/components/saveMyDate/editor/settings/FollowEventSettings';

// The "Follow the event" switch on its own, over the sample date section (KAN-84).
function FollowEventStory({ followsEvent }: { followsEvent: boolean }) {
    const { scope } = useStoryPanel('s-date', false, followsEvent);
    return (
        <div className="smd-editor max-w-xl bg-(--smd-editor-panel) p-4 text-[12.5px] text-(--smd-editor-text)">
            <FollowEventSettings scope={scope} />
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/FollowEventSettings',
    component: FollowEventStory,
    args: { followsEvent: true },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
} satisfies Meta<typeof FollowEventStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// Following: turning it off keeps the invitation's own copy.
export const Following: Story = {
    play: async ({ canvasElement, globals }) => {
        const toggle = within(canvasElement).getByRole('switch', { name: copyFor(globals).InvitationEditor.sectionSettings.followEvent });
        await expect(toggle).toBeChecked();
        await userEvent.click(toggle);
        await expect(toggle).not.toBeChecked();
    },
};

// The host took the section over: the switch is off until they follow the event again.
export const TakenOver: Story = { args: { followsEvent: false } };
