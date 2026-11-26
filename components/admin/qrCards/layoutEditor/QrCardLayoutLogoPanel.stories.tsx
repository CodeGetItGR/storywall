import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { QrCardLayoutLogoPanel } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutLogoPanel';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';

// The panel only calls the two logo colour handlers.
function editor(): QrCardLayoutEditorState {
    return { handleLogoColorModeChange: fn(), handleLogoColorChange: fn() } as unknown as QrCardLayoutEditorState;
}

// The logo's colour choice, at the width of the editor's side panel.
const meta = {
    title: 'Admin/QrCards/LayoutEditor/LogoPanel',
    component: QrCardLayoutLogoPanel,
    args: { editor: editor(), logo: { x: 30, y: 129.7, width: 45, color: null } },
    decorators: [
        withAdminShell,
        (Story) => (
            <div className="w-[17rem]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrCardLayoutLogoPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Brand colours: no colour picker.
export const Original: Story = {
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: copy.logoColorOptions.original })).toBeChecked();
        await expect(canvas.queryByRole('button', { name: copy.color })).toBeNull();
    },
};

// Picking One colour asks the editor to switch.
export const ChooseOneColour: Story = {
    tags: ['visual-skip'],
    async play({ canvasElement, globals, args }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        await userEvent.click(within(canvasElement).getByRole('radio', { name: copy.logoColorOptions.one }));
        await expect(args.editor.handleLogoColorModeChange).toHaveBeenCalled();
    },
};

// One colour: its hex and the picker on their own row.
export const OneColour: Story = {
    args: { logo: { x: 30, y: 129.7, width: 45, color: '#B8860B' } },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: copy.logoColorOptions.one })).toBeChecked();
        await expect(canvas.getByText('#B8860B')).toBeVisible();
    },
};
