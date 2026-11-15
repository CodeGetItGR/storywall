import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrPreviewSongCard, QrPreviewWishCard } from '@/components/qrLanding/QrPreviewCards';

// The join preview's floating cards at full size, before the preview scales them down.
function PreviewCards() {
    return (
        <div className="flex flex-col gap-6">
            <QrPreviewWishCard />
            <QrPreviewSongCard />
        </div>
    );
}

const meta = {
    title: 'QrLanding/QrPreviewCards',
    component: PreviewCards,
    decorators: [
        (Story) => (
            <div className="bg-surface-muted p-8">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PreviewCards>;

export default meta;
type Story = StoryObj<typeof meta>;

// The wish and the song card.
export const Default: Story = {};
