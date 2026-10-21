'use client';

import { useTranslations } from 'next-intl';

import type { MediaTypeConvention, ProCreditDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// "Photo: Studio X" on a Pro item.
export function ProCreditLine({
    credit,
    mediaType,
    className,
}: {
    credit: ProCreditDto | null | undefined;
    mediaType: MediaTypeConvention;
    className?: string;
}) {
    const t = useTranslations('Vendors.credit');
    const tTypes = useTranslations('Vendors.types');
    if (!credit) return null;

    const name = credit.businessName ?? tTypes(credit.vendorType);
    return <p className={cn('text-sm', className)}>{mediaType === 'VIDEO' ? t('video', { name }) : t('photo', { name })}</p>;
}
