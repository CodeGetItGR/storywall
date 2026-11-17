import { useTranslations } from 'next-intl';

// Grey blocks in the theme page's shape while it loads.
export function ThemePageLoading() {
    const t = useTranslations('SaveMyDateStorefront.theme');

    return (
        <div aria-busy="true" aria-label={t('loading')} className="grid gap-8 min-[761px]:grid-cols-2 min-[761px]:gap-12" role="status">
            <div className="mx-auto aspect-[9/15.6] w-full max-w-90 animate-pulse rounded-[28px] bg-[#151313]/6 motion-reduce:animate-none" />
            <div className="flex flex-col gap-4">
                <div className="h-11 w-2/3 animate-pulse rounded-full bg-[#151313]/6 motion-reduce:animate-none" />
                <div className="h-5 w-1/4 animate-pulse rounded-full bg-[#151313]/6 motion-reduce:animate-none" />
                <div className="h-40 animate-pulse rounded-3xl bg-[#151313]/6 motion-reduce:animate-none" />
            </div>
        </div>
    );
}
