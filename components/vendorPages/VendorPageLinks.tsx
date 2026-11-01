import { getLocale, getTranslations } from 'next-intl/server';

import { INNER, SECONDARY_LINK } from '@/components/forBusiness/forBusinessStyles';
import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { TYPE_ICONS } from '@/components/vendorPages/vendorPageIcons';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getVendorPagePath, VENDOR_PAGE_TYPES, type VendorPageType } from '@/i18n/publicLocale';
import { cn } from '@/lib/utils';

// One link per vendor page, with an icon. Shared by the vendor pages and the landing's business section.
export async function VendorTypeLinks({ exclude, className }: { exclude?: VendorPageType; className?: string }) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('VendorPages.types');

    return (
        <ul className={cn('m-0 flex list-none flex-wrap gap-3 p-0', className)}>
            {VENDOR_PAGE_TYPES.filter((type) => type !== exclude).map((type) => (
                <li key={type}>
                    <a
                        href={getVendorPagePath(type, locale)}
                        className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-5 text-sm font-semibold no-underline shadow-[0_1px_0_rgba(21,19,19,0.08),0_10px_24px_-18px_rgba(21,19,19,0.5)] transition-transform hover:-translate-y-0.5"
                    >
                        <GradientIcon icon={TYPE_ICONS[type]} className="size-5" />
                        {t(`${type}.label`)}
                    </a>
                </li>
            ))}
        </ul>
    );
}

export async function VendorPageLinks({ type }: { type: VendorPageType }) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('VendorPages');

    return (
        /* Other professionals */
        <section className="px-5 pt-4 pb-16 min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:py-18">
            <div className={INNER}>
                <h2 className="m-0 mb-7 [font-family:var(--editorial)] text-3xl font-normal tracking-[-0.03em] min-[761px]:text-4xl">{t('sections.others')}</h2>
                <VendorTypeLinks exclude={type} />
                <p className="m-0 mt-8">
                    <a href={getForBusinessPath(locale)} className={SECONDARY_LINK}>
                        {t('others')}
                    </a>
                </p>
            </div>
        </section>
    );
}
