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

// The section tools the editor has, each with its icon, in the order the section's toolbar shows them.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const rows = within(canvasElement)
            .getAllByRole('listitem')
            .map((row) => row.textContent);
        await expect(rows).toEqual([copy.sections.hide, copy.sectionSettings.open, copy.sections.drag, copy.sections.options]);
    },
};
