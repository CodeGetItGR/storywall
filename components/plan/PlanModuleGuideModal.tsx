'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import type { PaidServiceResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { getModuleMeta, publicEnabledModules } from '@/lib/planModules';

export function PlanModuleGuideModal({
    open,
    onClose,
    modules,
    paidServices = [],
}: {
    open: boolean;
    onClose: () => void;
    modules: PlatformModuleResponseDto[];
    paidServices?: PaidServiceResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const tModules = useTranslations('Modules');
    const visibleModules = publicEnabledModules(modules);
    const publicModuleUnlocks = new Set(
        paidServices
            .filter((service) => service.kind === 'MODULE_UNLOCK' && service.isPublic && service.isAssignable && service.grantsModuleKey)
            .map((service) => service.grantsModuleKey)
    );

    return (
        <Modal open={open} onClose={onClose} size="sm" closeLabel={t('compare.moduleLegendClose')}>
            <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                <h2 className="text-lg font-semibold text-ink">{t('compare.moduleLegendTitle')}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{t('compare.moduleLegendBody')}</p>
                <div className="mt-4 divide-y divide-border border-y border-border">
                    {visibleModules.map((module_) => {
                        const moduleKey = module_.moduleKey;
                        const meta = getModuleMeta(moduleKey, modules);
                        const Icon = meta.Icon;
                        return (
                            <div key={moduleKey} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-ink">
                                        {tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                                        {tModules.has(`${moduleKey}.description`)
                                            ? tModules(`${moduleKey}.description`)
                                            : meta.description || t('compare.moduleLegendFallback')}
                                    </p>
                                    {publicModuleUnlocks.has(moduleKey) && (
                                        <p className="mt-1 text-xs font-semibold text-primary-dark">{t('compare.moduleLegendAddon')}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal.Body>
        </Modal>
    );
}
