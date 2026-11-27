import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HOST_TOOLS, LONG_NAME, LONG_UNIVERSITY, onDark, SectionStory, storyGraduates, storySection } from '@/.storybook/invitation';

const noStyles = { textStyles: {} };
const graduates = (list: ReturnType<typeof storyGraduates>) => storySection('graduates', { style: 'polaroids', graduates: list }, noStyles);

const meta = {
    title: 'SaveMyDate/Family/Graduates/Polaroids',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: graduates(storyGraduates(2)) },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoGraduates: Story = {};

export const OneGraduate: Story = { args: { section: graduates(storyGraduates(1)) } };

export const SixGraduates: Story = { args: { section: graduates(storyGraduates(6)) } };

export const LongTexts: Story = {
    args: { section: graduates(storyGraduates(2).map((graduate) => ({ ...graduate, name: LONG_NAME, university: LONG_UNIVERSITY }))) },
};

// A guest sees a graduate without a photo as text only.
export const WithoutPhotoGuest: Story = {
    args: { section: graduates([storyGraduates(1)[0], storyGraduates(2, false)[1]]) },
};

// A host sees the empty photo where one can go.
export const WithoutPhotoHost: Story = {
    args: { section: graduates([storyGraduates(1)[0], storyGraduates(2, false)[1]]), canvasTools: HOST_TOOLS },
};

export const OnDarkBackground: Story = { args: { section: onDark(graduates(storyGraduates(2))) } };
