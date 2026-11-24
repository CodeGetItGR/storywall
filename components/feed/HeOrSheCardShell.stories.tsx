import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { copyFor } from '@/.storybook/copy';
import { HeOrSheCardShell } from '@/components/feed/HeOrSheCardShell';
import { TallyBar } from '@/components/heOrShe/TallyBar';

const meta = {
    title: 'Feed/HeOrSheCardShell',
    component: HeOrSheCardShell,
    args: {
        title: '',
        closesTime: null,
        children: (
            <div className="mt-6">
                <TallyBar tally={{ he: 8, she: 12 }} />
            </div>
        ),
    },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
    render: (args, { globals }) => <HeOrSheCardShell {...args} title={copyFor(globals).Modules.he_or_she.name} />,
} satisfies Meta<typeof HeOrSheCardShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Its countdown shows in HeOrShePromptCard's stories.
export const NoCountdown: Story = {};
