import { priceInputToMinor, storageInputToBytes } from '@/lib/adminPlanForm';
import { checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
import type { BillingPeriod, PlanTierPatchDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatLimitValue } from '@/lib/planTiers';

export type PlanEditorTranslate = (key: string) => string;

export type PendingPlanSave = {
    patch: PlanTierPatchDto;
    moduleKeys: string[];
    changes: Array<{ label: string; before: string; after: string }>;
    moduleChanges: Array<{ label: string; tone: 'added' | 'removed' }>;
};

export function planPatchFromFormData(plan: PlanTierResponseDto, formData: FormData): PlanTierPatchDto {
    return {
        name: String(formData.get('name') ?? '').trim(),
        description: emptyToNull(formData.get('description')),
        sortOrder: Number(formData.get('sortOrder') ?? plan.sortOrder),
        isPublic: checked(formData, 'isPublic'),
        isAssignable: checked(formData, 'isAssignable'),
        storageBytes: plan.scope === 'EVENT' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
        maxMembers: plan.scope === 'EVENT' ? numberOrNull(formData.get('maxMembers')) : null,
        maxActiveEvents: plan.scope === 'ACCOUNT' ? numberOrNull(formData.get('maxActiveEvents')) : null,
        priceAmountMinor: priceInputToMinor(formData.get('price')),
        priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
        billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
        recurringPriceAmountMinor: plan.scope === 'EVENT' ? priceInputToMinor(formData.get('recurringPrice')) : null,
        includedMonths: plan.scope === 'EVENT' ? numberOrNull(formData.get('includedMonths')) : null,
        discountPercent: numberOrNull(formData.get('discountPercent')),
        discountLabel: emptyToNull(formData.get('discountLabel')),
        discountStartsAt: emptyToNull(formData.get('discountStartsAt')),
        discountEndsAt: emptyToNull(formData.get('discountEndsAt')),
    };
}

export function sameStringSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((item) => rightSet.has(item));
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
    } else {
        add(t('fields.maxEventsPerUser'), countLabel(plan.maxActiveEvents), countLabel(patch.maxActiveEvents ?? null));
    }

    add(
        t('fields.price'),
        moneyLabel(plan.priceAmountMinor, plan.priceCurrency),
        moneyLabel(patch.priceAmountMinor ?? null, patch.priceCurrency ?? null)
    );
    add(t('fields.billingPeriod'), textLabel(plan.billingPeriod), textLabel(patch.billingPeriod));

    if (plan.scope === 'EVENT') {
        add(
            t('fields.recurringPrice'),
            moneyLabel(plan.recurringPriceAmountMinor, plan.priceCurrency),
            moneyLabel(patch.recurringPriceAmountMinor ?? null, patch.priceCurrency ?? null)
        );
        add(
            t('fields.includedMonths'),
            textLabel(plan.includedMonths === null ? null : String(plan.includedMonths)),
            textLabel(patch.includedMonths === null ? null : String(patch.includedMonths))
        );
    }

    add(t('fields.isAssignable'), booleanLabel(plan.isAssignable), booleanLabel(Boolean(patch.isAssignable)));
    add(t('fields.isPublic'), booleanLabel(plan.isPublic), booleanLabel(Boolean(patch.isPublic)));

    return changes;
}

export function moduleChangeSummary(
    beforeKeys: string[],
    afterKeys: string[],
    modules: PlatformModuleResponseDto[]
): PendingPlanSave['moduleChanges'] {
    const moduleName = (key: string) => modules.find((module) => module.moduleKey === key)?.name ?? key;
    const before = new Set(beforeKeys);
    const after = new Set(afterKeys);
    const added = afterKeys.filter((key) => !before.has(key)).map((key) => ({ label: moduleName(key), tone: 'added' as const }));
    const removed = beforeKeys.filter((key) => !after.has(key)).map((key) => ({ label: moduleName(key), tone: 'removed' as const }));

    return [...added, ...removed];
}
