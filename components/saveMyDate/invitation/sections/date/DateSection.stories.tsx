import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { onDark, SectionStory, storySection } from '@/.storybook/invitation';
import type { InvitationSection } from '@/lib/invitation/sections';
import { type PreviewDateLanguage, type PreviewDateStyle,previewDocument } from '@/lib/saveMyDatePreview';

// The date as the staging preview writes it, in the given layout and language.
function dateIn(displayStyle: PreviewDateStyle, language: PreviewDateLanguage = 'el') {
    const preview = previewDocument(displayStyle, language).sections.find((section) => section.type === 'date') as Extract<InvitationSection, { type: 'date' }>;
    return storySection('date', preview.data);
}

const meta = {
    title: 'SaveMyDate/Date/DateSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: dateIn('original') },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Original: Story = {};

export const Stacked: Story = {
    args: { section: dateIn('stacked') },
};

export const Editorial: Story = {
    args: { section: dateIn('editorial') },
};

export const Vertical: Story = {
    args: { section: dateIn('vertical') },
};

export const Bullet: Story = {
    args: { section: dateIn('bullet') },
};

export const Split: Story = {
    args: { section: dateIn('split') },
};

export const Triple: Story = {
    args: { section: dateIn('triple') },
};

export const Calendar: Story = {
    args: { section: dateIn('calendar') },
};

export const EnglishOriginal: Story = {
    args: { section: dateIn('original', 'en') },
};

export const EnglishCalendar: Story = {
    args: { section: dateIn('calendar', 'en') },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(dateIn('original')) },
};

export const CalendarOnDarkBackground: Story = {
    args: { section: onDark(dateIn('calendar')) },
};
