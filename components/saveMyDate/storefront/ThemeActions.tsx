import { useTranslations } from 'next-intl';

import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/saveMyDate/storefront/storefrontStyles';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type ThemeActionsProps = { slug: string };

// The theme's live demo and the editor starting from it. Pinned to the bottom of the screen on phones,
// in the page from desktop up.
export function ThemeActions({ slug }: ThemeActionsProps) {
    const t = useTranslations('SaveMyDateStorefront.theme');

    return (
        <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2 border-t border-[#151313]/10 bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm min-[761px]:static min-[761px]:z-auto min-[761px]:flex min-[761px]:border-0 min-[761px]:bg-transparent min-[761px]:p-0 min-[761px]:backdrop-blur-none">
            <a className={cn(SECONDARY_BUTTON, 'min-h-12 max-[760px]:px-3 max-[760px]:text-sm')} href={routes.saveMyDatePreview(slug)}>
                {t('liveDemo')}
            </a>
            <a className={cn(PRIMARY_BUTTON, 'min-h-12 max-[760px]:px-3 max-[760px]:text-sm')} href={routes.saveMyDateEditorStart(slug)}>
                {t('tryFree')}
            </a>
        </div>
    );
}
