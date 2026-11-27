import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { PrivateView } from '@/components/occasions/sections/private/PrivateView';
import { privateViewProps } from '@/components/occasions/sections/private/privateViewProps';

const meta = { title: 'Occasions/PrivateView', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wedding: Story = {
    render: (_, { globals }) => <PrivateView {...privateViewProps(translatorFor(globals, 'OccasionPages.WEDDING.private'))} />,
};

export const Baptism: Story = {
    render: (_, { globals }) => <PrivateView {...privateViewProps(translatorFor(globals, 'OccasionPages.BAPTISM.private'))} />,
};
