'use client';

import { useTranslations } from 'next-intl';

import { VendorServiceTagChip } from '@/components/vendors/profile/VendorServiceTagChip';
import type { PartnerRole, VendorServiceTag } from '@/lib/api/types';
import { VENDOR_SERVICE_TAGS, VENDOR_SERVICE_TAGS_MAX } from '@/lib/vendors';

// The type's services as chips to tap on and off. Once the limit is reached the rest wait until one is taken off.
export function VendorServiceTagsField({
    vendorType,
    selected,
    disabled,
    onToggleAction,
}: {
    vendorType: PartnerRole;
    selected: readonly VendorServiceTag[];
    disabled: boolean;
    onToggleAction: (tag: VendorServiceTag) => void;
}) {
    const t = useTranslations('Vendors');
    const tags = VENDOR_SERVICE_TAGS[vendorType];
    if (tags.length === 0) return null;
    const full = selected.length >= VENDOR_SERVICE_TAGS_MAX;

    return (
        <fieldset className="flex flex-col gap-1.5">
            {/* Label */}
            <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {t('profile.services', { max: VENDOR_SERVICE_TAGS_MAX })}
            </legend>

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                    const on = selected.includes(tag);
                    return (
                        <VendorServiceTagChip
                            key={tag}
                            tag={tag}
                            selected={on}
                            disabled={disabled || (!on && full)}
                            onToggleAction={onToggleAction}
                        />
                    );
                })}
            </div>
        </fieldset>
    );
}
