import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { EditorTourToolRows } from '@/components/saveMyDate/editor/tour/EditorTourToolRows';

const meta = {
    title: 'SaveMyDate/Editor/Tour/EditorTourToolRows',
    component: EditorTourToolRows,
    decorators: [
        (Story) => (
            <div className="w-87.5 bg-white p-4 text-[#24262a]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EditorTourToolRows>;

export default meta;
type Story = StoryObj<typeof meta>;

// The section tools the editor has, each with its icon.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const sections = copyFor(globals).InvitationEditor.sections;
        const rows = within(canvasElement);
        for (const label of [sections.hide, sections.drag, sections.options]) await expect(rows.getByText(label)).toBeVisible();
    },
};
