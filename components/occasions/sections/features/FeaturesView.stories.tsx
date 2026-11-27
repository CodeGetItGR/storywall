import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { FeaturesView } from '@/components/occasions/sections/features/FeaturesView';
import { featuresViewProps } from '@/components/occasions/sections/features/featuresViewProps';
import { OCCASION_PAGE_FEATURE_ORDER } from '@/lib/occasions/pageFeatures';

const meta = { title: 'Occasions/FeaturesView', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Every module on offer; a feature the occasion has no copy for is left out.
const FEATURE_KEYS = [...OCCASION_PAGE_FEATURE_ORDER];

// The wedding: all ten.
export const Wedding: Story = {
    render: (_, { globals }) => (
        <FeaturesView
            {...featuresViewProps({
                common: translatorFor(globals, 'OccasionPages.common'),
                featureKeys: FEATURE_KEYS,
                page: translatorFor(globals, 'OccasionPages.WEDDING'),
            })}
        />
    ),
};

// The baptism: the ones it has copy for.
export const Baptism: Story = {
    render: (_, { globals }) => (
        <FeaturesView
            {...featuresViewProps({
                common: translatorFor(globals, 'OccasionPages.common'),
                featureKeys: FEATURE_KEYS,
                page: translatorFor(globals, 'OccasionPages.BAPTISM'),
            })}
        />
    ),
};
