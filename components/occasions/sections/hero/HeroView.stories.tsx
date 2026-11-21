import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { HeroView } from '@/components/occasions/sections/hero/HeroView';
import { heroViewProps } from '@/components/occasions/sections/hero/heroViewProps';
import { heroVisual } from '@/components/occasions/sections/hero/heroVisual';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const PRICE = { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' } as const;

// The occasion page's hero, signed out. The header, the breadcrumb and the phone are all part of it.
const meta = {
    title: 'Occasions/HeroView',
    decorators: [withAppContext, withOccasionPage],
    parameters: { app: { user: null }, layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The wedding: the landing's own phone, the demo as the second button.
export const Wedding: Story = {
    render: (_, { globals }) => (
        <HeroView
            {...heroViewProps({
                alternatePaths: { el: '/el/gamos', en: '/weddings' },
                campaign: null,
                common: translatorFor(globals, 'OccasionPages.common'),
                createHref: '/register',
                demoHref: '/demo',
                landing: translatorFor(globals, 'LandingPage'),
                locale: globals.locale === 'el' ? 'el' : 'en',
                page: translatorFor(globals, 'OccasionPages.WEDDING'),
                price: PRICE,
                qrHref: '/el/qr-code-gamou',
                themesHref: null,
                visual: {},
            })}
        />
    ),
};

// The baptism: its own phone and post cards, the themes as the second button.
export const Baptism: Story = {
    render: (_, { globals }) => (
        <HeroView
            {...heroViewProps({
                alternatePaths: { el: '/el/vaptisi', en: '/baptisms' },
                campaign: null,
                common: translatorFor(globals, 'OccasionPages.common'),
                createHref: '/register',
                demoHref: null,
                landing: translatorFor(globals, 'LandingPage'),
                locale: globals.locale === 'el' ? 'el' : 'en',
                page: translatorFor(globals, 'OccasionPages.BAPTISM'),
                price: PRICE,
                qrHref: null,
                themesHref: '#themes',
                visual: heroVisual(BAPTISM_PAGE_MEDIA.hero!, translatorFor(globals, 'OccasionPages.BAPTISM')('hero.feedAlt')),
            })}
        />
    ),
};
