'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { getModuleMeta } from '@/lib/planModules';
import { routes } from '@/lib/routes';

const SHOWCASE_MODULE_KEYS = ['posts', 'stories', 'gallery', 'playlist', 'rsvp', 'wishlist', 'wishbook'];

function ModuleCard({ moduleKey }: { moduleKey: string }) {
    const tModules = useTranslations('Modules');
    const meta = getModuleMeta(moduleKey, []);
    const name = tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name;
    const description = tModules.has(`${moduleKey}.description`) ? tModules(`${moduleKey}.description`) : meta.description;
    const Icon = meta.Icon;

    return (
        <div className="flex w-40 shrink-0 flex-col gap-2.5 rounded-2xl border border-border bg-card/60 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white">
                <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-ink">{name}</p>
                <p className="line-clamp-3 text-xs text-ink-muted">{description}</p>
            </div>
        </div>
    );
}

export function HomeModulesShowcase() {
    const t = useTranslations('HomePage');

    return (
        <section aria-labelledby="home-modules-heading" className="flex flex-col gap-3">
            <div className="flex items-end justify-between px-1">
                <div>
                    <h2 id="home-modules-heading" className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        {t('modules.title')}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-muted">{t('modules.subtitle')}</p>
                </div>
                <Link href={routes.plans()} className="shrink-0 text-xs font-semibold text-brand">
                    {t('modules.seePlans')}
                </Link>
            </div>
            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2">
                {SHOWCASE_MODULE_KEYS.map((moduleKey) => (
                    <ModuleCard key={moduleKey} moduleKey={moduleKey} />
                ))}
            </div>
        </section>
    );
}
