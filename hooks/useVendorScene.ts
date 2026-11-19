'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useAllowedVendorTypes } from '@/hooks/useAllowedVendorTypes';
import { type VendorSceneType, vendorSceneTypes } from '@/lib/vendors';

export type VendorScene = { types: VendorSceneType[]; alt: string };

// The Vendors empty-state picture: the allowed types it draws, and its alt text naming them.
export function useVendorScene(eventId: string): VendorScene {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const allowed = useAllowedVendorTypes(eventId);

    return useMemo(() => {
        const types = vendorSceneTypes(allowed);
        // en-GB joins without the serial comma ("photographer, planner and music").
        const list = new Intl.ListFormat(locale === 'en' ? 'en-GB' : locale, { type: 'conjunction' });
        const names = types.map((type) => t(`types.${type}`).toLocaleLowerCase(locale));
        return { types, alt: t('manage.sceneAlt', { types: list.format(names) }) };
    }, [allowed, locale, t]);
}
