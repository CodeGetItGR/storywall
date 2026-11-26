import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';
import { FRAME_DESIGNS, FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl } from '@/lib/uploadFrame';

const text = { title: 'Η αποφοίτηση της Μαρίας', date: '2 Ιουλίου 2026' };
const src = (design: (typeof FRAME_DESIGNS)[number], width: number, height: number) => frameSvgDataUrl(frameSvg(design, { width, height }, text));

const meta = {
    title: 'Gallery/UploadFrame',
    component: UploadFrameSwitch,
    args: {
        control: {
            on: false,
            toggle: fn(),
            previewSrc: src('CLASSIC', FRAME_PREVIEW_SIZE.width, FRAME_PREVIEW_SIZE.height),
            label: 'Add frame',
            alt: 'Graduation frame preview',
        },
    },
    decorators: [(Story) => <div className="max-w-sm p-4">{Story()}</div>],
} satisfies Meta<typeof UploadFrameSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwitchOff: Story = {};

export const SwitchOn: Story = { args: { control: { ...meta.args.control, on: true } } };

// Each design on a portrait and a landscape photo (spec §10).
export const Designs: Story = {
    tags: ['visual-desktop-only'],
    render: () => (
        <div className="flex flex-col gap-6">
            {FRAME_DESIGNS.map((design) => (
                <div key={design} className="flex items-start gap-4">
                    <UploadFramePreview src={src(design, 1500, 2000)} alt={design} className="aspect-[3/4] w-60 rounded-lg" />
                    <UploadFramePreview src={src(design, 2000, 1500)} alt={design} className="aspect-[4/3] w-80 rounded-lg" />
                </div>
            ))}
        </div>
    ),
};

export const LongTitle: Story = {
    render: () => (
        <UploadFramePreview
            src={frameSvgDataUrl(
                frameSvg(
                    'CLASSIC',
                    { width: 1500, height: 2000 },
                    { title: 'Η αποφοίτηση της Μαρίας, του Νίκου και της Ελένης από τη Νομική', date: text.date },
                ),
            )}
            alt="CLASSIC"
            className="aspect-[3/4] w-72 rounded-lg"
        />
    ),
};
