'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { enabledModuleKeys, getModuleMeta } from '@/lib/planModules';

export function PlanModuleGuideModal({
    open,
    onClose,
    moduleKeys,
    modules,
}: {
    open: boolean;
    onClose: () => void;
    moduleKeys: string[];
    modules: PlatformModuleResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const visibleModuleKeys = enabledModuleKeys(moduleKeys, modules);

    return (
        <Modal open={open} onClose={onClose} size="sm" closeLabel={t('compare.moduleLegendClose')}>
            <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                <h2 className="text-lg font-semibold text-ink">{t('compare.moduleLegendTitle')}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{t('compare.moduleLegendBody')}</p>
                <div className="mt-4 divide-y divide-border border-y border-border">
                    {visibleModuleKeys.map((moduleKey) => {
                        const meta = getModuleMeta(moduleKey, modules);
                        const Icon = meta.Icon;
                        return (
                            <div key={moduleKey} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-ink">{meta.name}</p>
                                    <p className="mt-1 text-sm leading-6 text-ink-muted">{meta.description || t('compare.moduleLegendFallback')}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal.Body>
        </Modal>
    );
}
