'use client';

import { ChartColumn, HandHeart, IdCard, type LucideIcon, MessageCircleQuestion, Package, Printer, ReceiptText, TicketPercent } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { ComingPartnerBenefitKey, PartnerBenefitKey } from '@/lib/vendors';

const ICONS: Record<PartnerBenefitKey | ComingPartnerBenefitKey, LucideIcon> = {
    discount: TicketPercent,
    feedCard: IdCard,
    reach: ChartColumn,
    printPrices: ReceiptText,
    inquiries: MessageCircleQuestion,
    printKit: Printer,
    eventPacks: Package,
};

// The partner program on the vendor page, in StoryWall's logo gradient (the only place the page uses it, along with
// the lock badges that point here). A non-partner sees what partners get now and what's coming; a partner sees only
// what's coming, since what they have already shows up on the page itself.
export function PartnerBenefitsSection({
    partner,
    canApply,
    benefits,
    coming,
    onApplyAction,
}: {
    partner: boolean;
    canApply: boolean;
    benefits: readonly PartnerBenefitKey[];
    coming: readonly ComingPartnerBenefitKey[];
    onApplyAction: () => void;
}) {
    const t = useTranslations('Vendors.partner');

    return (
        <section aria-labelledby="vendor-partner-title" className="relative overflow-hidden rounded-[1.75rem] bg-(image:--logo) p-5 text-ink sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/85 shadow-xs">
                    <HandHeart className="size-5.5 text-primary-dark" aria-hidden="true" />
                </span>
                <h2 id="vendor-partner-title" className="text-xl leading-tight font-bold tracking-tight">
                    {partner ? t('youArePartner') : t('title')}
                </h2>
            </div>

            {/* Now */}
            {!partner && (
                <div className="mt-5">
                    <h3 className="text-sm font-semibold">{t('nowTitle')}</h3>
                    <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        {benefits.map((key) => (
                            <BenefitTile key={key} benefit={key} />
                        ))}
                    </ul>
                </div>
            )}

            {/* Coming soon */}
            {coming.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-sm font-semibold">{t('comingTitle')}</h3>
                    <ul className="mt-2.5 grid gap-2 sm:grid-cols-3">
                        {coming.map((key) => (
                            <BenefitTile key={key} benefit={key} soon />
                        ))}
                    </ul>
                </div>
            )}

            {/* Apply */}
            {!partner && canApply && (
                <Button type="button" size="lg" className="mt-6 w-full bg-ink text-white hover:bg-ink/90" onClick={onApplyAction}>
                    {t('become')}
                </Button>
            )}
        </section>
    );
}

// A benefit on a frosted tile. Coming ones are lighter and dashed, so the two groups read apart at a glance.
function BenefitTile({ benefit, soon = false }: { benefit: PartnerBenefitKey | ComingPartnerBenefitKey; soon?: boolean }) {
    const t = useTranslations('Vendors.partner');
    const Icon = ICONS[benefit];

    return (
        <li
            className={
                soon
                    ? 'flex items-start gap-3 rounded-lg border border-dashed border-ink/25 bg-white/35 p-3'
                    : 'flex items-start gap-3 rounded-lg bg-white/80 p-3 shadow-xs'
            }
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-primary-dark">
                <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-sm leading-snug font-semibold">{t(`benefits.${benefit}.title`)}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink/70">{t(`benefits.${benefit}.body`)}</p>
            </div>
        </li>
    );
}
