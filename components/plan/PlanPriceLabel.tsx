import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getPlanPriceDetails, type PlanPriceKind } from '@/lib/planTiers';

type PlanPriceLabelProps = {
    plan: PlanTierResponseDto;
    kind: PlanPriceKind;
    locale: string;
    fallback: string;
    suffix?: string;
    className?: string;
};

export function PlanPriceLabel({ plan, kind, locale, fallback, suffix, className }: PlanPriceLabelProps) {
    const price = getPlanPriceDetails(plan, kind);

    if (!price) return <span className={className}>{fallback}</span>;

    const hasDiscount = price.discountActive && price.amountMinor !== price.listAmountMinor;

    return (
        <span className={className}>
            {hasDiscount && (
                <span className="mr-2 text-xs font-semibold text-ink-faint">
                    <span className="line-through decoration-2">{formatMoney(locale, price.listAmountMinor, price.currency)}</span>
                </span>
            )}
            <span>
                {formatMoney(locale, price.amountMinor, price.currency)}
                {suffix}
            </span>
            {hasDiscount && price.discountLabel && <span className="ml-2 text-xs font-semibold text-primary-dark">{price.discountLabel}</span>}
        </span>
    );
}
