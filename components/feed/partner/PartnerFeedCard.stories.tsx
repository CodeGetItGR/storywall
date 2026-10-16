import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PartnerCardVariant, PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import { usePartnerCardLabels } from '@/hooks/usePartnerBrandingCard';
import type { PartnerBrandingDto } from '@/lib/api/types';

// Covers the three variants (PartnerFeatureCard, PartnerCompactRow, PartnerCredit)
// and their parts (PartnerLogo, PartnerCardLabel, PartnerCardLink).
const branding: PartnerBrandingDto = {
    variant: 'FEATURE_CARD',
    displayName: 'Aegean Weddings',
    role: 'PLANNER',
    logoUrl: '/landing/decor-03.webp',
    coverUrl: '/landing/03-wedding-ceremony-santorini.webp',
    tagline: { en: 'Island weddings planned down to the last petal.', el: 'Γάμοι στα νησιά, οργανωμένοι ως την τελευταία λεπτομέρεια.' },
    services: { en: 'Planning · Styling · Venues', el: 'Οργάνωση · Styling · Χώροι' },
    linkUrl: '/api/partner-branding/click/abc',
    placement: { firstAfter: 2, every: 6 },
};

const meta = {
    title: 'Feed/Partner/PartnerFeedCard',
    component: PartnerFeedCard,
    args: { branding },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PartnerFeedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FeatureCard: Story = {};

export const CompactRow: Story = {
    args: { branding: { ...branding, variant: 'COMPACT_ROW' } },
};

export const Credit: Story = {
    args: { branding: { ...branding, variant: 'CREDIT' } },
};

// OTHER shows no role next to the "Partner" label.
export const NoRole: Story = {
    args: { branding: { ...branding, variant: 'COMPACT_ROW', role: 'OTHER' } },
};

export const LongText: Story = {
    args: {
        branding: {
            ...branding,
            displayName: 'The Santorini Sunset Wedding & Event Planning Company',
            tagline: {
                en: 'From the first idea to the last dance, we take care of every detail so you can enjoy the day with the people you love.',
                el: 'Από την πρώτη ιδέα ως τον τελευταίο χορό, φροντίζουμε κάθε λεπτομέρεια για να απολαύσετε τη μέρα με τους ανθρώπους σας.',
            },
        },
    },
};

// The admin preview: no link and no images yet.
function AdminPreviewCards() {
    const labels = usePartnerCardLabels();
    return (
        <div className="flex flex-col">
            {(['FEATURE_CARD', 'COMPACT_ROW', 'CREDIT'] as const).map((variant) => (
                <PartnerCardVariant
                    key={variant}
                    variant={variant}
                    content={{
                        ...labels,
                        href: null,
                        name: branding.displayName,
                        roleLabel: labels.roleLabel(branding.role),
                        tagline: branding.tagline.en,
                        services: branding.services.en,
                        logoUrl: null,
                        coverUrl: null,
                    }}
                />
            ))}
        </div>
    );
}

export const AdminPreview: Story = {
    render: () => <AdminPreviewCards />,
};
