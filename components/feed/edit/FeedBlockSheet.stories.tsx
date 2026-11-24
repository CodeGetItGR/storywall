import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';

// The photo prompt's sheet, typing into it. Also shows FeedPromptField.
function PromptSheet({ title, text, isDesktop }: { title: string; text: string; isDesktop: boolean }) {
    const [value, setValue] = useState(text);
    return (
        <FeedBlockSheet
            title={title}
            open
            scope={null}
            groups={[]}
            parts={[]}
            partLabels={{ cover: '', title: '', date: '', location: '', description: '' }}
            isDesktop={isDesktop}
            membersOnly={null}
            onMembersOnly={fn()}
            promptText={value}
            onPromptText={setValue}
            onOpenPart={fn()}
            onClose={fn()}
        />
    );
}

const meta = {
    title: 'Feed/Edit/FeedBlockSheet',
    component: PromptSheet,
    args: { title: '', text: '', isDesktop: true },
    parameters: { layout: 'fullscreen' },
    // The app's own name for the section, in the language the story is shown in.
    render: (args, { globals }) => <PromptSheet {...args} title={copyFor(globals).InvitationEditor.sectionNames.feedPrompt} />,
    decorators: [
        (Story) => (
            <div className="min-h-120">
                <Story />
            </div>
        ),
    ],
    play: async () => {
        await waitForOpen('dialog');
    },
} satisfies Meta<typeof PromptSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhotoPrompt: Story = {};

export const PhotoPromptMobile: Story = { args: { isDesktop: false }, globals: { viewport: { value: 'mobile' } } };
