'use client';

import { useTranslations } from 'next-intl';

// The theme's assets. Empty until the admin assets panel is built.
export function ThemeAssetsPanel() {
    const t = useTranslations('InvitationEditor');

    return <p className="opacity-70">{t('noAssets')}</p>;
}
