import { planPromotionOpen } from '@/lib/adminCollaborations';
import { localInputToInstant, priceInputToMinor, storageInputToBytes } from '@/lib/adminPlanForm';
import { emptyToNull, numberOrNull } from '@/lib/adminUtils';
import type { Visibility } from '@/lib/adminVisibility';
import { visibilityFlags } from '@/lib/adminVisibility';
import type { BillingPeriod, PlanTierPatchDto, PlanTierResponseDto } from '@/lib/api/types';
import { numberFormat } from '@/lib/format';
import { formatLimitValue } from '@/lib/planTiers';

export type PlanEditorTranslate = (key: string) => string;

const SELLABLE_BILLING_PERIODS: BillingPeriod[] = ['ONE_TIME'];

export type PlanMembershipChange = {
    label: string;
    added: string[];
    removed: string[];
};

export type PendingPlanSave = {
    patch: PlanTierPatchDto;
    changes: Array<{ label: string; before: string; after: string }>;
    memberships: PlanMembershipChange[];
    warnings: string[];
    // Non-null only when that list actually changed, so the save skips the call otherwise.
    moduleKeys: string[] | null;
};

export type UnlockDraft = {
    moduleKey: string;
    moduleName: string;
    name: string;
    description: string;
    price: string;
    priceCurrency: string;
    billingPeriod: 'MONTHLY' | 'ONE_TIME';
};

// The form's controls that live in state rather than in FormData.
export type PlanEditorControls = { visibility: Visibility; isGiftable: boolean };

export function planPatchFromFormData(
    plan: PlanTierResponseDto,
    formData: FormData,
    { visibility, isGiftable }: PlanEditorControls,
): PlanTierPatchDto {
    const flags = visibilityFlags(visibility);
    const values: PlanTierPatchDto = {
        name: String(formData.get('name') ?? '').trim(),
        description: emptyToNull(formData.get('description')),
        isPublic: flags.isPublic,
        isAssignable: flags.isAssignable,
        // An EVENT plan is priced by its durations, so it never sends a price of
        // its own; the server refuses one with 400 INVALID_PLAN_TIER_SCOPE.
        ...(plan.scope === 'EVENT'
            ? {
                  storageBytes: storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')),
                  maxMembers: numberOrNull(formData.get('maxMembers')),
                  // Gifting only means anything on an EVENT plan.
                  isGiftable,
              }
            : { priceAmountMinor: priceInputToMinor(formData.get('price')) }),
        priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
        billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
        discountPercent: numberOrNull(formData.get('discountPercent')),
        discountLabel: emptyToNull(formData.get('discountLabel')),
        discountStartsAt: localInputToInstant(formData.get('discountStartsAt')),
        discountEndsAt: localInputToInstant(formData.get('discountEndsAt')),
    };
    return { ...values, ...planClearFlags(plan, values) };
}

// The server reads a null as "leave it", so emptying a saved value needs its flag. Each flag goes
// only when set, because the server refuses a property it does not know.
function planClearFlags(plan: PlanTierResponseDto, values: PlanTierPatchDto): PlanTierPatchDto {
    const emptied = (current: unknown, next: unknown) => (current ?? null) !== null && (next ?? null) === null;
    return {
        ...(plan.scope === 'EVENT' && emptied(plan.storageBytes, values.storageBytes) && { clearStorageBytes: true }),
        ...(plan.scope === 'EVENT' && emptied(plan.maxMembers, values.maxMembers) && { clearMaxMembers: true }),
        ...(emptied(plan.discountPercent, values.discountPercent) && { clearDiscountPercent: true }),
        ...(emptied(plan.discountStartsAt, values.discountStartsAt) && { clearDiscountStartsAt: true }),
        ...(emptied(plan.discountEndsAt, values.discountEndsAt) && { clearDiscountEndsAt: true }),
    };
}

// Promotion consequences the field list alone does not show. The values are the plan as it will be
// after this save, and the promotion window reads the same way the server's does.
export function planSaveWarnings(plan: PlanTierResponseDto, patch: PlanTierPatchDto, t: PlanEditorTranslate, now = new Date()): string[] {
    const after = {
        discountPercent: patch.clearDiscountPercent ? null : (patch.discountPercent ?? plan.discountPercent),
        discountStartsAt: patch.clearDiscountStartsAt ? null : (patch.discountStartsAt ?? plan.discountStartsAt),
        discountEndsAt: patch.clearDiscountEndsAt ? null : (patch.discountEndsAt ?? plan.discountEndsAt),
    };
    const hasPromoPrice = plan.initialOptions.some((option) => option.active && option.promoPriceAmountMinor !== null);
    const warnings: string[] = [];

    if (hasPromoPrice && after.discountEndsAt === null && (patch.clearDiscountPercent || patch.clearDiscountEndsAt)) {
        warnings.push(t('plans.saveSummary.promoPricesNoEnd'));
    }

    const dateEmptied = patch.clearDiscountStartsAt || patch.clearDiscountEndsAt;
    const hasDiscount = hasPromoPrice || (after.discountPercent ?? 0) > 0;
    if (dateEmptied && hasDiscount && !planPromotionOpen(plan, now) && planPromotionOpen(after, now)) {
        warnings.push(t('plans.saveSummary.goesLiveOnSave'));
    }

    return warnings;
}

// A saved period the form no longer sells stays listed, so a save can't quietly move the plan off it.
export function billingPeriodOptions(current: BillingPeriod | null): BillingPeriod[] {
    return current && !SELLABLE_BILLING_PERIODS.includes(current) ? [...SELLABLE_BILLING_PERIODS, current] : SELLABLE_BILLING_PERIODS;
}

export function planChangeSummary(plan: PlanTierResponseDto, patch: PlanTierPatchDto, t: PlanEditorTranslate) {
    const changes: PendingPlanSave['changes'] = [];
    const none = t('none');
    const unlimited = t('unlimited');
    const booleanLabel = (value: boolean) => (value ? 'Enabled' : 'Disabled');
    const textLabel = (value: string | null | undefined) => value || none;
    const countLabel = (value: number | null) => (value === null ? unlimited : value.toLocaleString());
    const moneyLabel = (amountMinor: number | null, currency: string | null) => {
        if (amountMinor === null || !currency) return t('plans.noPrice');
        return numberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100);
    };
    const storageLabel = (value: number | null) => formatLimitValue(value, 'bytes') ?? unlimited;
    const add = (label: string, before: string, after: string) => {
        if (before !== after) changes.push({ label, before, after });
    };

    // These can't be emptied: the server leaves them alone on a null, so a null is no change.
    const currencyAfter = patch.priceCurrency ?? plan.priceCurrency;
    const priceAfter = patch.priceAmountMinor ?? plan.priceAmountMinor;
    const billingPeriodAfter = patch.billingPeriod ?? plan.billingPeriod;

    add(t('fields.name'), plan.name, patch.name ?? '');
    add(t('fields.description'), textLabel(plan.description), textLabel(patch.description));

    if (plan.scope === 'EVENT') {
        add(t('fields.storage'), storageLabel(plan.storageBytes), storageLabel(patch.storageBytes ?? null));
        add(t('fields.maxMembers'), countLabel(plan.maxMembers), countLabel(patch.maxMembers ?? null));
        add(t('fields.priceCurrency'), textLabel(plan.priceCurrency), textLabel(currencyAfter));
    } else {
        add(
            t('fields.price'),
            moneyLabel(plan.priceAmountMinor, plan.priceCurrency),
            moneyLabel(priceAfter, currencyAfter),
        );
    }

    add(t('fields.billingPeriod'), textLabel(plan.billingPeriod), textLabel(billingPeriodAfter));

    // A promotion is money: a change here has to be visible in the confirmation,
    // not applied quietly because the field lives further down the form.
    const percentLabel = (value: number | null) => (value === null ? none : `${value}%`);
    const dateLabel = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : none);

    add(t('fields.discountPercent'), percentLabel(plan.discountPercent), percentLabel(patch.discountPercent ?? null));
    add(t('fields.discountLabel'), textLabel(plan.discountLabel), textLabel(patch.discountLabel));
    add(t('fields.discountStartsAt'), dateLabel(plan.discountStartsAt), dateLabel(patch.discountStartsAt));
    add(t('fields.discountEndsAt'), dateLabel(plan.discountEndsAt), dateLabel(patch.discountEndsAt));

    add(t('fields.isAssignable'), booleanLabel(plan.isAssignable), booleanLabel(Boolean(patch.isAssignable)));
    add(t('fields.isPublic'), booleanLabel(plan.isPublic), booleanLabel(Boolean(patch.isPublic)));
    if (plan.scope === 'EVENT') add(t('fields.isGiftable'), booleanLabel(plan.isGiftable), booleanLabel(patch.isGiftable ?? plan.isGiftable));

    return changes;
}
