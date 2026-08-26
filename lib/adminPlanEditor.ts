import { localInputToInstant, priceInputToMinor, storageInputToBytes } from '@/lib/adminPlanForm';
import { emptyToNull, numberOrNull } from '@/lib/adminUtils';
import type { Visibility } from '@/lib/adminVisibility';
import { visibilityFlags } from '@/lib/adminVisibility';
import type { BillingPeriod, PlanTierPatchDto, PlanTierResponseDto } from '@/lib/api/types';
import { formatLimitValue } from '@/lib/planTiers';

export type PlanEditorTranslate = (key: string) => string;

export type PendingPlanSave = {
    patch: PlanTierPatchDto;
    changes: Array<{ label: string; before: string; after: string }>;
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

export function planPatchFromFormData(plan: PlanTierResponseDto, formData: FormData, visibility: Visibility): PlanTierPatchDto {
    const flags = visibilityFlags(visibility);
    return {
        name: String(formData.get('name') ?? '').trim(),
        description: emptyToNull(formData.get('description')),
        sortOrder: Number(formData.get('sortOrder') ?? plan.sortOrder),
        isPublic: flags.isPublic,
        isAssignable: flags.isAssignable,
        storageBytes: plan.scope === 'EVENT' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
        maxMembers: plan.scope === 'EVENT' ? numberOrNull(formData.get('maxMembers')) : null,
        priceAmountMinor: priceInputToMinor(formData.get('price')),
        priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
        billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
        discountPercent: numberOrNull(formData.get('discountPercent')),
        discountLabel: emptyToNull(formData.get('discountLabel')),
        discountStartsAt: localInputToInstant(formData.get('discountStartsAt')),
        discountEndsAt: localInputToInstant(formData.get('discountEndsAt')),
    };
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
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100);
    };
    const storageLabel = (value: number | null) => formatLimitValue(value, 'bytes') ?? unlimited;
    const add = (label: string, before: string, after: string) => {
        if (before !== after) changes.push({ label, before, after });
    };

    add(t('fields.name'), plan.name, patch.name ?? '');
    add(t('fields.description'), textLabel(plan.description), textLabel(patch.description));
    add(t('fields.sort'), String(plan.sortOrder), String(patch.sortOrder ?? plan.sortOrder));

    if (plan.scope === 'EVENT') {
        add(t('fields.storage'), storageLabel(plan.storageBytes), storageLabel(patch.storageBytes ?? null));
        add(t('fields.maxMembers'), countLabel(plan.maxMembers), countLabel(patch.maxMembers ?? null));
    }

    add(
        t('fields.price'),
        moneyLabel(plan.priceAmountMinor, plan.priceCurrency),
        moneyLabel(patch.priceAmountMinor ?? null, patch.priceCurrency ?? null)
    );
    add(t('fields.billingPeriod'), textLabel(plan.billingPeriod), textLabel(patch.billingPeriod));

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

    return changes;
}
