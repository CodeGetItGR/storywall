'use client';

import { Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';

/** The features an upgrade no longer includes, so nobody loses one by surprise. */
export function PlanRemovedModules({ moduleKeys, eventTypeKey }: { moduleKeys: string[]; eventTypeKey: EventTypeConvention | null }) {
    const t = useTranslations('EventPlanSettingsPage.compare');
    const moduleLabel = useModuleCopy(eventTypeKey);
    if (moduleKeys.length === 0) return null;

    return (
        <div>
            <p className="text-xs font-bold text-status-danger">{t('removedModules')}</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
                {moduleKeys.map((moduleKey) => (
                    <li key={moduleKey} className="flex items-center gap-2 text-sm text-status-danger">
                        <Minus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {moduleLabel(moduleKey).name}
                    </li>
                ))}
            </ul>
        </div>
    );
}
