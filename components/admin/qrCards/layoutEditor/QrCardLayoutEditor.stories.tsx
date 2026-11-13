import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { QrCardLayoutEditor } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { addLogo, DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: null,
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: true,
    layout: null,
    artworkWidth: null,
};
const WITH_LOGO = addLogo(DEFAULT_QR_CARD_LAYOUT);

// Focusing an element selects it. The drawer moves focus to its first element as it opens, so keep
// focusing the logo until the side panel names it.
async function selectLogo(drawer: HTMLElement, name: string) {
    const logo = within(drawer).getByRole('button', { name });
    await waitFor(() => {
        logo.focus();
        expect(within(drawer).getByRole('heading', { name })).toBeVisible();
    });
}

// The full-screen layout editor. It portals itself to the body, with the console's palette on it.
// Dragging can't be captured, so the stories select an element the way the keyboard does: by focusing it.
const meta = {
    title: 'Admin/QrCards/LayoutEditor',
    component: QrCardLayoutEditor,
    args: { template: LINEN, onSavedAction: fn(), onCloseAction: fn() },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof QrCardLayoutEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// Nothing selected: the card's own settings, and the Add logo button with the other add buttons.
export const Card: Story = {};

// A saved logo, selected: its colour in the brand colours, and Remove logo.
export const LogoSelected: Story = {
    args: { template: { ...LINEN, layout: WITH_LOGO } },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        const drawer = await waitForOpen('dialog');
        await selectLogo(drawer, copy.elements.logo);
        await expect(within(drawer).getByRole('button', { name: copy.removeLogo })).toBeVisible();
    },
};

// The logo in one colour: the colour picker shows next to the choice.
export const LogoOneColour: Story = {
    args: { template: { ...LINEN, layout: { ...WITH_LOGO, logo: { ...WITH_LOGO.logo!, color: '#B8860B' } } } },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        const drawer = await waitForOpen('dialog');
        await selectLogo(drawer, copy.elements.logo);
        await expect(within(drawer).getByRole('radio', { name: copy.logoColorOptions.one })).toBeChecked();
    },
};

// Add logo from the button: the logo is placed and selected.
export const AddLogo: Story = {
    tags: ['visual-skip'],
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.qrCards.layout;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: copy.addLogo }));
        await expect(within(drawer).getByRole('button', { name: copy.removeLogo })).toBeVisible();
    },
};
