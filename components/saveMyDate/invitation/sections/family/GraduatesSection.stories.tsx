import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const NAMES = ['Μαρία', 'Νίκος', 'Ελένη', 'Γιώργος', 'Άννα', 'Κώστας'];

function storyGraduates(count: number, withPhotos = true) {
    return NAMES.slice(0, count).map((name, index) => ({
        id: `graduate-${index}`,
        name,
        degree: 'Πτυχίο Νομικής',
        university: 'Αριστοτέλειο Πανεπιστήμιο Θεσσαλονίκης',
        ...(withPhotos ? { photo: { source: 'media' as const, mediaId: 'm-g1' } } : {}),
    }));
}

const noStyles = { textStyles: {} };
const graduates = storySection('graduates');

const meta = {
    title: 'SaveMyDate/Family/GraduatesSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: graduates },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoGraduates: Story = {};

export const OneGraduate: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(1) }, noStyles) },
};

export const SixGraduates: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(6) }, noStyles) },
};

export const WithoutPhotos: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(3, false) }, noStyles) },
};

export const LongNames: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(2).map((graduate) => ({ ...graduate, name: LONG_NAME })) }, noStyles) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(graduates) },
};
